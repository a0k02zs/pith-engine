// Client workspace: account connections, client brains, strategies and the video studio.
// Holds the server-only secrets (tokens in the vault, API keys from the environment).
import type { Hono } from "hono";
import type { Context } from "hono";
import { SERVICES } from "./catalog.js";
import {
  emptyConnections, MetaOAuth, metaConfig, publicConnections, saveIds, TokenVault,
  type ClientConnections, type Fetch, type PlatformKey,
} from "./connections.js";
import { clientLinks, serviceLinks } from "./links.js";
import { ApiError, type Store } from "./store.js";
import { buildStrategy, seedBrain, type ClientBrain, type Strategy, type StrategyImprover } from "./strategy.js";
import type { ApprovalItem, ServiceCode, User } from "./types.js";
import { Engines, PLATFORM_LABELS, poster, runChecks, storyboard, validateBrief, type EngineId, type Shot, type Variant, type VideoProject } from "./video.js";

export type Env = Record<string, string | undefined>;

/** Server environment. In the browser preview there is none, so every integration runs simulated. */
export function serverEnv(): Env {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

export interface WorkspaceOptions {
  env?: Env;
  fetch?: Fetch;
  improver?: StrategyImprover | null;
}

export class Workspace {
  connections = new Map<string, ClientConnections>();
  brains = new Map<string, ClientBrain>();
  strategies = new Map<string, Strategy>();
  videos: VideoProject[] = [];
  vault: TokenVault;
  meta: MetaOAuth;
  engines: Engines;
  improver: StrategyImprover | null;
  private env: Env;

  constructor(private store: Store, opts: WorkspaceOptions = {}) {
    this.env = opts.env ?? serverEnv();
    const f: Fetch = opts.fetch ?? ((u, i) => globalThis.fetch(u, i));
    this.vault = new TokenVault(this.env.PITH_TOKEN_KEY || null);
    this.meta = new MetaOAuth(metaConfig(this.env), f, () => store.now());
    this.engines = new Engines(this.env, f);
    this.improver = opts.improver ?? null;
    for (const c of store.clients) {
      this.connections.set(c.id, emptyConnections());
      this.brains.set(c.id, seedBrain(c));
    }
    this.seedDemo();
    store.approvalHooks.push((item) => this.onApprovalClosed(item));
  }

  private seedDemo() {
    // One client with saved Meta IDs, so the deep links show how they work. Test IDs only.
    const lumen = this.store.clients.find((c) => c.name.startsWith("Lumen"));
    if (lumen) saveIds(this.conn(lumen.id), "meta", { business_id: "100000000000001", ad_account_id: "act_100000000000002", page_id: "100000000000003" });
  }

  conn(clientId: string) {
    this.store.client(clientId);
    let c = this.connections.get(clientId);
    if (!c) this.connections.set(clientId, (c = emptyConnections()));
    return c;
  }

  integrations() {
    return {
      meta_oauth: this.meta.configured,
      token_key_persistent: this.vault.persistentKey,
      claude: Boolean(this.improver),
      engines: this.engines.status(),
    };
  }

  // ---------- strategy ----------

  brain(clientId: string) {
    this.store.client(clientId);
    return this.brains.get(clientId)!;
  }

  saveBrain(clientId: string, body: Record<string, unknown>, actor: User) {
    const b = this.brain(clientId);
    const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split(/\n|,/)).map((x) => String(x).trim()).filter(Boolean);
    if (body.positioning !== undefined) b.positioning = String(body.positioning).trim();
    if (body.audience !== undefined) b.audience = String(body.audience).trim();
    if (body.tone !== undefined) b.tone = String(body.tone).trim();
    if (body.notes !== undefined) b.notes = String(body.notes).trim();
    if (body.goals !== undefined) b.goals = list(body.goals).slice(0, 5);
    if (body.competitors !== undefined) b.competitors = list(body.competitors).slice(0, 8);
    if (body.offers !== undefined) b.offers = list(body.offers).slice(0, 8);
    if (body.monthly_budget !== undefined) {
      const n = Number(body.monthly_budget);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new ApiError(400, "Monthly budget must be a number from 0 to 10,000,000.");
      b.monthly_budget = Math.round(n);
    }
    if (!b.goals.length) throw new ApiError(400, "Add at least 1 goal.");
    b.updated_at = new Date(this.store.now()).toISOString();
    this.store.log(actor.name, "brain.updated", clientId, clientId, "Client brain changed");
    this.strategies.delete(clientId); // the next read rebuilds the plan from the new brain
    return b;
  }

  strategy(clientId: string): Strategy {
    const client = this.store.client(clientId);
    const cur = this.strategies.get(clientId);
    if (cur) return cur;
    const s = buildStrategy(client, this.brain(clientId), this.store.metrics, this.store.now());
    this.strategies.set(clientId, s);
    return s;
  }

  regenerate(clientId: string, actor: User) {
    const prev = this.strategy(clientId);
    if (prev.status === "in_review") throw new ApiError(409, "This plan is waiting for approval. Decide it first.");
    const s = buildStrategy(this.store.client(clientId), this.brain(clientId), this.store.metrics, this.store.now(), prev.version + 1);
    this.strategies.set(clientId, s);
    this.store.log(actor.name, "strategy.generated", clientId, clientId, `Version ${s.version}`);
    return s;
  }

  async improve(clientId: string, actor: User) {
    if (!this.improver) throw new ApiError(503, "Claude is not set up on this server. An admin sets ANTHROPIC_API_KEY. The playbook plan works without it.");
    const s = this.strategy(clientId);
    if (s.status === "in_review") throw new ApiError(409, "This plan is waiting for approval.");
    s.claude_notes = await this.improver({ client: this.store.client(clientId), brain: this.brain(clientId), strategy: s });
    s.source = "playbooks+claude";
    this.store.log(actor.name, "strategy.improved", clientId, clientId, "Claude notes added");
    return s;
  }

  submitStrategy(clientId: string, actor: User) {
    const s = this.strategy(clientId);
    if (s.status === "in_review") throw new ApiError(409, "Already waiting for approval.");
    if (s.status === "approved") throw new ApiError(409, "Already approved. Make a new version to change it.");
    const c = this.store.client(clientId);
    const item = this.store.openStandaloneApproval({
      client_id: clientId, service: s.plays[0]?.service ?? c.services[0], kind: "plan",
      title: `Plan: ${c.name} 90-day strategy v${s.version}`,
      summary: s.summary,
      payload: { strategy_client_id: clientId, strategy_version: s.version, monthly_budget: s.budget.monthly, currency: s.budget.currency, services: s.plays.length },
      required_roles: ["account_lead", "strategist", "client_approver"], required_count: 2, sla_hours: 72, priority: "normal",
    });
    s.status = "in_review";
    s.approval_id = item.id;
    this.store.log(actor.name, "strategy.submitted", clientId, item.id, `v${s.version}`);
    return s;
  }

  // ---------- video studio ----------

  video(id: string) {
    const v = this.videos.find((x) => x.id === id);
    if (!v) throw new ApiError(404, "Video project not found");
    return v;
  }

  createVideo(body: Record<string, unknown>, actor: User) {
    const client = this.store.client(String(body.client_id ?? ""));
    if (!client.services.includes("video")) throw new ApiError(422, `${client.name} does not buy video production. Add the service first.`);
    const brief = validateBrief(body, client.markets);
    const now = new Date(this.store.now()).toISOString();
    const v: VideoProject = {
      id: this.store.uuid(), client_id: client.id, created_by: actor.name, created_at: now, updated_at: now, brief,
      script: null, shots: [], variants: [], status: "brief", checks: runChecks(brief), approval_id: null, last_comment: null, export: null,
    };
    this.videos.unshift(v);
    this.store.log(actor.name, "video.brief_created", client.id, v.id, brief.title);
    return v;
  }

  writeStoryboard(id: string, actor: User) {
    const v = this.video(id);
    this.editable(v);
    const sb = storyboard(v.brief, this.brain(v.client_id).tone);
    v.script = sb.script;
    v.shots = sb.shots;
    v.variants = [];
    v.status = "storyboard";
    this.touch(v);
    this.store.log(actor.name, "video.storyboard", v.client_id, v.id, `${v.shots.length} shots`);
    return v;
  }

  editShots(id: string, shots: unknown, actor: User) {
    const v = this.video(id);
    this.editable(v);
    if (!Array.isArray(shots)) throw new ApiError(400, "shots must be a list");
    for (const s of shots as Array<Partial<Shot>>) {
      const cur = v.shots.find((x) => x.id === s.id);
      if (!cur) continue;
      if (s.engine === "runway" || s.engine === "higgsfield") cur.engine = s.engine;
      if (typeof s.visual === "string" && s.visual.trim()) cur.visual = s.visual.trim().slice(0, 300);
      if (typeof s.on_screen_text === "string") cur.on_screen_text = s.on_screen_text.trim().slice(0, 80);
      if (typeof s.prompt === "string" && s.prompt.trim()) cur.prompt = s.prompt.trim().slice(0, 1000);
    }
    this.touch(v);
    this.store.log(actor.name, "video.storyboard_edited", v.client_id, v.id, "Shots changed");
    return v;
  }

  async generate(id: string, actor: User) {
    const v = this.video(id);
    this.editable(v);
    if (!v.shots.length) throw new ApiError(409, "Write the storyboard first.");
    v.checks = runChecks(v.brief);
    if (v.checks.outcome === "block") throw new ApiError(422, v.checks.findings.filter((f) => f.severity === "block").map((f) => f.message).join(" "));
    const mixes: Array<{ mix: EngineId | "mixed"; label: string; hue: number }> = [
      { mix: "mixed", label: "A · Mixed (storyboard picks)", hue: 222 },
      { mix: "runway", label: "B · Runway only", hue: 160 },
      { mix: "higgsfield", label: "C · Higgsfield only", hue: 290 },
    ];
    v.variants = [];
    for (const m of mixes) {
      const jobs = [];
      for (const s of v.shots) {
        const engine = m.mix === "mixed" ? s.engine : m.mix;
        jobs.push(await this.engines.submit(engine, s, v.brief, `sim-${this.store.uuid().slice(0, 8)}`));
      }
      const simulated = jobs.every((j) => j.mode === "simulated");
      v.variants.push({
        id: this.store.uuid(), label: m.label, mix: m.mix, status: jobs.some((j) => j.status === "failed") ? "failed" : "generating", jobs,
        poster: poster(m.label.split(" · ")[1], v.brief.aspect, v.script?.hook ?? v.brief.product, m.hue),
        gen_seconds: Math.round(v.shots.reduce((a, s) => a + (s.seconds > 5 ? 10 : 5), 0)),
        preview_score: simulated ? 74 + ((m.hue * 7 + v.shots.length * 3) % 21) : null, selected: false,
      });
    }
    v.status = "generating";
    this.touch(v);
    this.store.log(actor.name, "video.generate", v.client_id, v.id, `${v.variants.length} variants, ${v.shots.length} shots each`);
    return v;
  }

  async refresh(id: string) {
    const v = this.video(id);
    if (v.status !== "generating") return v;
    for (const variant of v.variants) {
      for (const j of variant.jobs) await this.engines.poll(j);
      variant.status = variant.jobs.some((j) => j.status === "failed") ? "failed" : variant.jobs.every((j) => j.status === "succeeded") ? "ready" : "generating";
    }
    if (v.variants.every((x) => x.status !== "generating")) v.status = "review";
    this.touch(v);
    return v;
  }

  select(id: string, variantId: string, actor: User) {
    const v = this.video(id);
    if (!["review", "changes_requested"].includes(v.status)) throw new ApiError(409, "Pick a variant when generation is done.");
    const pick = v.variants.find((x) => x.id === variantId);
    if (!pick || pick.status !== "ready") throw new ApiError(400, "Pick a ready variant.");
    for (const x of v.variants) x.selected = x.id === variantId;
    this.touch(v);
    this.store.log(actor.name, "video.variant_selected", v.client_id, v.id, pick.label);
    return v;
  }

  submitVideo(id: string, actor: User) {
    const v = this.video(id);
    const pick = v.variants.find((x) => x.selected);
    if (!pick) throw new ApiError(409, "Pick the winning variant first.");
    if (v.status === "in_approval") throw new ApiError(409, "Already waiting for approval.");
    const warn = v.checks.findings.filter((f) => f.severity !== "info").length;
    const item = this.store.openStandaloneApproval({
      client_id: v.client_id, service: "video" as ServiceCode, kind: "creative",
      title: `Creative: AI ad "${v.brief.title}" (${pick.label.split(" · ")[1]})`,
      summary: `${v.brief.duration_s}s ${v.brief.aspect} for ${v.brief.platforms.length} platforms in ${v.brief.markets.join(", ")}. AI-generated with ${pick.mix === "mixed" ? "Runway and Higgsfield" : pick.mix === "runway" ? "Runway" : "Higgsfield"}. AI label on every platform.`,
      payload: { video_project_id: v.id, variant: pick.label, hook: v.script?.hook, ai_labels: v.checks.ai_labels.map((l) => `${l.platform}: ${l.label}`) },
      // Same gate as video.job approve_final_client.
      required_roles: ["creative_lead", "client_approver"], required_count: 2, sla_hours: 48,
      brand_score: pick.preview_score,
      compliance: { check_id: this.store.uuid(), outcome: v.checks.outcome, findings_count: warn },
    });
    v.approval_id = item.id;
    v.status = "in_approval";
    this.touch(v);
    this.store.log(actor.name, "video.submitted", v.client_id, item.id, v.brief.title);
    return v;
  }

  exportVideo(id: string, actor: User) {
    const v = this.video(id);
    if (v.status !== "approved") throw new ApiError(409, "Only an approved ad can be exported. Send it for approval first.");
    const pick = v.variants.find((x) => x.selected)!;
    const url = pick.jobs.find((j) => j.output_url)?.output_url ?? null;
    v.export = {
      at: new Date(this.store.now()).toISOString(), by: actor.name,
      files: v.brief.platforms.map((p) => ({ platform: PLATFORM_LABELS[p].name, aspect: v.brief.aspect, label: PLATFORM_LABELS[p].ai_label, url })),
      handoff: "Video never publishes. Paid social and organic social publish these exports with the AI label on.",
    };
    v.status = "exported";
    this.touch(v);
    this.store.log(actor.name, "video.exported", v.client_id, v.id, `${v.export.files.length} files`);
    return v;
  }

  private editable(v: VideoProject) {
    if (["in_approval", "approved", "exported"].includes(v.status)) throw new ApiError(409, `This project is ${v.status.replace("_", " ")}. It cannot change now.`);
  }

  private touch(v: VideoProject) {
    v.updated_at = new Date(this.store.now()).toISOString();
  }

  private onApprovalClosed(item: ApprovalItem) {
    const vid = item.payload.video_project_id;
    if (typeof vid === "string") {
      const v = this.videos.find((x) => x.id === vid);
      if (!v || v.approval_id !== item.id) return;
      v.status = item.status === "approved" ? "approved" : item.status === "rejected" ? "rejected" : "changes_requested";
      v.last_comment = item.decisions.at(-1)?.comment ?? null;
      this.touch(v);
      return;
    }
    const cid = item.payload.strategy_client_id;
    if (typeof cid === "string") {
      const s = this.strategies.get(cid);
      if (!s || s.approval_id !== item.id) return;
      s.status = item.status === "approved" ? "approved" : item.status === "rejected" ? "rejected" : "changes_requested";
    }
  }

  // ---------- connections ----------

  hasToken(clientId: string, p: PlatformKey) {
    return this.vault.has(`${clientId}:${p}`);
  }

  view(clientId: string) {
    return publicConnections(this.conn(clientId), (p) => this.hasToken(clientId, p));
  }

  async verifyMeta(clientId: string, actor: User) {
    const m = this.conn(clientId).meta;
    if (!m.ad_account_id) throw new ApiError(400, "Save the ad account ID first.");
    const token = await this.vault.get(`${clientId}:meta`);
    if (!token) throw new ApiError(409, "Sign in with Meta first. The check reads the ad account with the client's grant.");
    try {
      m.verified = await this.meta.verifyAdAccount(token, m.ad_account_id);
      m.status = "connected";
      m.last_error = null;
    } catch (e) {
      m.status = "error";
      m.last_error = (e as Error).message;
      throw e;
    }
    this.store.log(actor.name, "connection.verified", clientId, clientId, `Meta ${m.verified.name}`);
    return this.view(clientId);
  }

  disconnect(clientId: string, platform: string, actor: User) {
    const c = this.conn(clientId);
    if (platform === "meta") {
      this.vault.delete(`${clientId}:meta`);
      c.meta = emptyConnections().meta;
    } else if (platform in c) {
      (c as unknown as Record<string, unknown>)[platform] = (emptyConnections() as unknown as Record<string, unknown>)[platform];
    } else throw new ApiError(404, "Unknown platform");
    this.store.log(actor.name, "connection.removed", clientId, clientId, platform);
    return this.view(clientId);
  }
}

export function registerWorkspaceRoutes(api: Hono, store: Store, ws: Workspace, actor: (c: Context) => User, readJson: (c: Context) => Promise<Record<string, unknown>>) {
  api.get("/integrations", (c) => c.json(ws.integrations()));
  api.get("/services/:code/links", (c) => {
    const code = c.req.param("code") as ServiceCode;
    if (!SERVICES.some((s) => s.code === code)) throw new ApiError(404, "Service not found");
    return c.json(serviceLinks(code));
  });

  api.get("/clients/:id/connections", (c) => c.json(ws.view(c.req.param("id"))));
  api.get("/clients/:id/links", (c) => c.json(clientLinks(ws.conn(c.req.param("id")))));
  api.put("/clients/:id/connections/:platform", async (c) => {
    const id = c.req.param("id");
    saveIds(ws.conn(id), c.req.param("platform"), await readJson(c));
    store.log(actor(c).name, "connection.ids_saved", id, id, c.req.param("platform"));
    return c.json(ws.view(id));
  });
  api.delete("/clients/:id/connections/:platform", (c) => c.json(ws.disconnect(c.req.param("id"), c.req.param("platform"), actor(c))));
  api.post("/clients/:id/connections/meta/verify", async (c) => c.json(await ws.verifyMeta(c.req.param("id"), actor(c))));

  // Meta sign-in. The browser opens the URL; Meta sends the user back to the callback with a code.
  api.post("/oauth/meta/start", async (c) => {
    const body = await readJson(c);
    const id = String(body.client_id ?? "");
    store.client(id);
    return c.json({ url: ws.meta.start(id, actor(c).id) });
  });
  api.get("/oauth/meta/callback", async (c) => {
    const q = c.req.query();
    if (q.error) return c.redirect(`/#/clients?meta_error=${encodeURIComponent(q.error_description ?? q.error)}`);
    const res = await ws.meta.callback(String(q.code ?? ""), String(q.state ?? ""));
    await ws.vault.put(`${res.client_id}:meta`, res.token);
    const m = ws.conn(res.client_id).meta;
    m.connected_by = store.user(res.user).name;
    m.connected_at = new Date(store.now()).toISOString();
    m.token_expires_at = res.expires_at;
    m.scopes = metaConfig(serverEnv()).scopes;
    m.status = "connected";
    store.log(m.connected_by, "connection.meta_granted", res.client_id, res.client_id, "Meta sign-in");
    if (m.ad_account_id) await ws.verifyMeta(res.client_id, store.user(res.user)).catch(() => undefined);
    return c.redirect(`/clients/${res.client_id}?tab=connections`);
  });

  api.get("/clients/:id/brain", (c) => c.json(ws.brain(c.req.param("id"))));
  api.put("/clients/:id/brain", async (c) => c.json(ws.saveBrain(c.req.param("id"), await readJson(c), actor(c))));
  api.get("/clients/:id/strategy", (c) => c.json(ws.strategy(c.req.param("id"))));
  api.post("/clients/:id/strategy/regenerate", (c) => c.json(ws.regenerate(c.req.param("id"), actor(c))));
  api.post("/clients/:id/strategy/improve", async (c) => c.json(await ws.improve(c.req.param("id"), actor(c))));
  api.post("/clients/:id/strategy/submit", (c) => c.json(ws.submitStrategy(c.req.param("id"), actor(c))));

  api.get("/video/projects", (c) => {
    const cid = c.req.query("client_id");
    return c.json(ws.videos.filter((v) => !cid || v.client_id === cid));
  });
  api.post("/video/projects", async (c) => c.json(ws.createVideo(await readJson(c), actor(c)), 201));
  api.get("/video/projects/:id", (c) => c.json(ws.video(c.req.param("id"))));
  api.post("/video/projects/:id/storyboard", (c) => c.json(ws.writeStoryboard(c.req.param("id"), actor(c))));
  api.put("/video/projects/:id/shots", async (c) => c.json(ws.editShots(c.req.param("id"), (await readJson(c)).shots, actor(c))));
  api.post("/video/projects/:id/generate", async (c) => c.json(await ws.generate(c.req.param("id"), actor(c))));
  api.post("/video/projects/:id/refresh", async (c) => c.json(await ws.refresh(c.req.param("id"))));
  api.post("/video/projects/:id/select", async (c) => c.json(ws.select(c.req.param("id"), String((await readJson(c)).variant_id ?? ""), actor(c))));
  api.post("/video/projects/:id/submit", (c) => c.json(ws.submitVideo(c.req.param("id"), actor(c))));
  api.post("/video/projects/:id/export", (c) => c.json(ws.exportVideo(c.req.param("id"), actor(c))));
}

export type { Variant };
