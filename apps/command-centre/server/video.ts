// Video studio (beta): AI ads made with Runway and Higgsfield.
// Flow: brief -> script and storyboard -> variants (one per engine mix) -> creative approval -> export.
// Rules from services/video/docs/05-market-rules.md and engine/specs/compliance-rules.json:
// - consent before likeness (G8): no real person's face or voice without written consent;
// - every AI ad carries an AI label (Meta "AI info", TikTok AI-generated label, YouTube synthetic
//   content disclosure, EU AI Act Art. 50 in EU markets);
// - the client approves the final ad (video.job approve_final_client: creative_lead + client_approver, 2 people);
// - video never publishes: social and paid publish the exports.
// API keys stay on the server. Without keys, or without a key frame image, the studio simulates the jobs.
import { complianceFor, marketGroupOf } from "./catalog.js";
import type { Fetch } from "./connections.js";
import { ApiError } from "./store.js";

export type EngineId = "runway" | "higgsfield";
export type Platform = "meta_reels" | "tiktok" | "youtube_shorts" | "meta_feed";
export type Aspect = "9:16" | "1:1" | "16:9";

export interface VideoBrief {
  title: string;
  product: string;
  audience: string;
  objective: "awareness" | "consideration" | "conversions";
  platforms: Platform[];
  duration_s: 15 | 30;
  aspect: Aspect;
  markets: string[];
  offer: string;
  cta: string;
  style: string;
  key_frame_url: string | null;
  uses_real_likeness: boolean;
  likeness_consent_ref: string | null;
}

export interface Shot {
  id: string;
  n: number;
  seconds: number;
  visual: string;
  camera: string;
  on_screen_text: string;
  engine: EngineId;
  prompt: string;
}

export interface Job {
  shot_id: string;
  engine: EngineId;
  mode: "live" | "simulated";
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  output_url: string | null;
  error: string | null;
  polls: number;
}

export interface Variant {
  id: string;
  label: string;
  mix: EngineId | "mixed";
  status: "generating" | "ready" | "failed";
  jobs: Job[];
  poster: string;
  gen_seconds: number;
  preview_score: number | null;
  selected: boolean;
}

export interface Finding {
  rule: string;
  severity: "block" | "warn" | "info";
  message: string;
}

export interface VideoProject {
  id: string;
  client_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  brief: VideoBrief;
  script: { hook: string; voiceover: string[]; cta: string } | null;
  shots: Shot[];
  variants: Variant[];
  status: "brief" | "storyboard" | "generating" | "review" | "in_approval" | "approved" | "changes_requested" | "rejected" | "exported";
  checks: { outcome: "pass" | "warn" | "block"; findings: Finding[]; ai_labels: Array<{ platform: string; label: string }> };
  approval_id: string | null;
  last_comment: string | null;
  export: { at: string; by: string; files: Array<{ platform: string; aspect: Aspect; label: string; url: string | null }>; handoff: string } | null;
}

export const PLATFORM_LABELS: Record<Platform, { name: string; ai_label: string }> = {
  meta_reels: { name: "Instagram and Facebook Reels", ai_label: 'Meta "AI info" label on' },
  meta_feed: { name: "Facebook and Instagram feed", ai_label: 'Meta "AI info" label on' },
  tiktok: { name: "TikTok", ai_label: "TikTok AI-generated content label on" },
  youtube_shorts: { name: "YouTube Shorts", ai_label: "YouTube altered or synthetic content disclosure: yes" },
};

// ---------- engines ----------

export interface EngineStatus {
  id: EngineId;
  name: string;
  live: boolean;
  note: string;
}

export interface EngineEnv {
  RUNWAYML_API_SECRET?: string;
  RUNWAY_MODEL?: string;
  HF_API_KEY_ID?: string;
  HF_API_KEY_SECRET?: string;
  HIGGSFIELD_I2V_PATH?: string;
}

const RUNWAY_RATIO: Record<Aspect, string> = { "9:16": "720:1280", "1:1": "960:960", "16:9": "1280:720" };

export class Engines {
  constructor(private env: EngineEnv, private fetcher: Fetch) {}

  status(): EngineStatus[] {
    return [
      { id: "runway", name: "Runway", live: Boolean(this.env.RUNWAYML_API_SECRET), note: this.env.RUNWAYML_API_SECRET ? `Live: ${this.env.RUNWAY_MODEL || "gen4.5"} image to video` : "Simulated: set RUNWAYML_API_SECRET on the server" },
      { id: "higgsfield", name: "Higgsfield", live: Boolean(this.env.HF_API_KEY_ID && this.env.HF_API_KEY_SECRET), note: this.env.HF_API_KEY_ID ? "Live: image to video" : "Simulated: set HF_API_KEY_ID and HF_API_KEY_SECRET on the server" },
    ];
  }

  isLive(id: EngineId) {
    return this.status().find((e) => e.id === id)!.live;
  }

  /** Starts one shot. Live only with a server key and a key frame image (both engines animate an image). */
  async submit(engine: EngineId, shot: Shot, brief: VideoBrief, simId: string): Promise<Job> {
    const base = { shot_id: shot.id, engine, output_url: null, error: null, polls: 0 };
    if (!this.isLive(engine) || !brief.key_frame_url) return { ...base, mode: "simulated", job_id: simId, status: "queued" };
    try {
      if (engine === "runway") {
        const res = await this.fetcher("https://api.dev.runwayml.com/v1/image_to_video", {
          method: "POST",
          headers: { Authorization: `Bearer ${this.env.RUNWAYML_API_SECRET}`, "X-Runway-Version": "2024-11-06", "Content-Type": "application/json" },
          body: JSON.stringify({ promptImage: brief.key_frame_url, promptText: shot.prompt.slice(0, 1000), model: this.env.RUNWAY_MODEL || "gen4.5", ratio: RUNWAY_RATIO[brief.aspect], duration: shot.seconds > 5 ? 10 : 5 }),
        });
        const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok || !body.id) throw new Error(body.error ?? `Runway HTTP ${res.status}`);
        return { ...base, mode: "live", job_id: body.id, status: "queued" };
      }
      const path = this.env.HIGGSFIELD_I2V_PATH || "/higgsfield-ai/dop/standard";
      const res = await this.fetcher(`https://api.higgsfield.ai${path}`, {
        method: "POST",
        headers: { Authorization: `Key ${this.env.HF_API_KEY_ID}:${this.env.HF_API_KEY_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: brief.key_frame_url, prompt: shot.prompt.slice(0, 1000), duration: shot.seconds > 5 ? 10 : 5 }),
      });
      const body = (await res.json().catch(() => ({}))) as { request_id?: string; detail?: string };
      if (!res.ok || !body.request_id) throw new Error(body.detail ?? `Higgsfield HTTP ${res.status}`);
      return { ...base, mode: "live", job_id: body.request_id, status: "queued" };
    } catch (e) {
      return { ...base, mode: "live", job_id: "", status: "failed", error: (e as Error).message };
    }
  }

  async poll(job: Job): Promise<void> {
    if (job.status === "succeeded" || job.status === "failed") return;
    job.polls += 1;
    if (job.mode === "simulated") {
      job.status = job.polls >= 2 ? "succeeded" : "running";
      return;
    }
    try {
      if (job.engine === "runway") {
        const res = await this.fetcher(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(job.job_id)}`, {
          headers: { Authorization: `Bearer ${this.env.RUNWAYML_API_SECRET}`, "X-Runway-Version": "2024-11-06" },
        });
        const b = (await res.json().catch(() => ({}))) as { status?: string; output?: string[]; failure?: string };
        if (b.status === "SUCCEEDED") (job.status = "succeeded"), (job.output_url = b.output?.[0] ?? null);
        else if (b.status === "FAILED" || b.status === "CANCELLED") (job.status = "failed"), (job.error = b.failure ?? "Runway task failed");
        else job.status = "running";
        return;
      }
      const res = await this.fetcher(`https://api.higgsfield.ai/requests/${encodeURIComponent(job.job_id)}/status`, {
        headers: { Authorization: `Key ${this.env.HF_API_KEY_ID}:${this.env.HF_API_KEY_SECRET}` },
      });
      const b = (await res.json().catch(() => ({}))) as { status?: string; video?: { url?: string } };
      if (b.status === "completed") (job.status = "succeeded"), (job.output_url = b.video?.url ?? null);
      else if (b.status && ["failed", "nsfw", "canceled"].includes(b.status)) (job.status = "failed"), (job.error = `Higgsfield: ${b.status}`);
      else job.status = "running";
    } catch (e) {
      job.error = (e as Error).message;
    }
  }
}

// ---------- brief -> script and storyboard ----------

const PLATFORM_SET = new Set<Platform>(["meta_reels", "meta_feed", "tiktok", "youtube_shorts"]);

export function validateBrief(raw: Record<string, unknown>, clientMarkets: string[]): VideoBrief {
  const s = (k: string) => String(raw[k] ?? "").trim();
  const errors: string[] = [];
  const platforms = (Array.isArray(raw.platforms) ? raw.platforms : []).map(String).filter((p): p is Platform => PLATFORM_SET.has(p as Platform));
  const markets = (Array.isArray(raw.markets) ? raw.markets : clientMarkets).map(String).filter((m) => clientMarkets.includes(m));
  const key = s("key_frame_url");
  if (!s("product")) errors.push("Say what the ad sells.");
  if (!s("audience")) errors.push("Say who the ad is for.");
  if (!platforms.length) errors.push("Pick at least 1 platform.");
  if (!markets.length) errors.push("Pick at least 1 of the client's markets.");
  if (key && !/^https:\/\/\S+$/.test(key)) errors.push("The key frame must be an https:// image URL.");
  if (errors.length) throw new ApiError(400, errors.join(" "));
  const objective = (["awareness", "consideration", "conversions"].includes(s("objective")) ? s("objective") : "conversions") as VideoBrief["objective"];
  return {
    title: s("title") || `${s("product")} AI ad`,
    product: s("product"), audience: s("audience"), objective, platforms,
    duration_s: Number(raw.duration_s) === 30 ? 30 : 15,
    aspect: (["9:16", "1:1", "16:9"].includes(s("aspect")) ? s("aspect") : "9:16") as Aspect,
    markets, offer: s("offer"), cta: s("cta") || "Shop now", style: s("style") || "bright, natural light, premium",
    key_frame_url: key || null,
    uses_real_likeness: raw.uses_real_likeness === true,
    likeness_consent_ref: s("likeness_consent_ref") || null,
  };
}

const PEOPLE = /(person|people|woman|man|model|creator|guest|team|face|hands?|customer|family)/i;

export function storyboard(b: VideoBrief, tone: string): { script: VideoProject["script"]; shots: Shot[] } {
  const hook = b.objective === "awareness" ? `Meet ${b.product}.` : b.objective === "consideration" ? `Why ${b.audience.split(/[,.]/)[0].toLowerCase()} switch to ${b.product}.` : `${b.offer || b.product}: ${b.cta.toLowerCase()} today.`;
  const beats: Array<[string, string, string]> = [
    [`Close-up hero shot of ${b.product}, ${b.style}`, "slow push-in", hook],
    [`A customer from the audience (${b.audience}) uses ${b.product} in a real setting`, "handheld follow", "Made for you"],
    [`Detail shot that shows the main benefit of ${b.product}`, "macro orbit", "The difference you can see"],
    [`End card: ${b.product} with the offer ${b.offer || ""}`.trim(), "locked-off", b.cta],
  ];
  if (b.duration_s === 30) {
    beats.splice(2, 0, [`Before and after moment with ${b.product}`, "match cut", "Before. After."], [`Social proof: reviews and ratings on screen next to ${b.product}`, "slow pan", "Loved by customers"]);
  }
  const each = Math.round((b.duration_s / beats.length) * 10) / 10;
  const shots = beats.map(([visual, camera, text], i) => {
    const engine: EngineId = PEOPLE.test(visual) || /follow|orbit|match cut/.test(camera) ? "higgsfield" : "runway";
    return {
      id: `s${i + 1}`, n: i + 1, seconds: each, visual, camera, on_screen_text: text, engine,
      prompt: `${visual}. Camera: ${camera}. ${b.aspect} vertical-safe framing, ${b.style}. Tone: ${tone || "on brand"}. No text in the image, no logos other than the product, no real person's likeness.`,
    };
  });
  return {
    script: { hook, voiceover: beats.map((x) => x[2]), cta: b.cta },
    shots,
  };
}

export function runChecks(b: VideoBrief): VideoProject["checks"] {
  const findings: Finding[] = [];
  if (b.uses_real_likeness && !b.likeness_consent_ref) {
    findings.push({ rule: "G8-LIKENESS-CONSENT", severity: "block", message: "This ad uses a real person's face or voice. Add the written consent reference before generation." });
  }
  if (b.uses_real_likeness && b.likeness_consent_ref) {
    findings.push({ rule: "G8-LIKENESS-CONSENT", severity: "info", message: `Consent on file: ${b.likeness_consent_ref}. Keep it with the export.` });
  }
  if (/\d+\s?%|clinically|guarantee|best|no\.?\s?1|number one|cure/i.test(`${b.offer} ${b.product}`)) {
    findings.push({ rule: "G-CLAIM-APPROVED", severity: "warn", message: "The offer or product line has a claim. It needs proof and a claim approval before the ad goes live." });
  }
  const ai_labels: Array<{ platform: string; label: string }> = b.platforms.map((p) => ({ platform: PLATFORM_LABELS[p].name, label: PLATFORM_LABELS[p].ai_label }));
  for (const m of b.markets) {
    const r = complianceFor(m);
    if (marketGroupOf(m) === "EU" || r?.laws.some((l) => l.startsWith("EU AI Act"))) {
      if (!findings.some((f) => f.rule === "EU-AI-LABEL")) findings.push({ rule: "EU-AI-LABEL", severity: "info", message: "EU AI Act Art. 50: say in the ad that the video is AI-generated." });
    }
    if (r?.disclosure_labels.length) ai_labels.push({ platform: `Market ${m}`, label: `Paid ad label: ${r.disclosure_labels[0]}` });
  }
  findings.push({ rule: "VIDEO-AI-LABEL", severity: "info", message: "Realistic AI video: turn on each platform's AI label when it is published." });
  const outcome = findings.some((f) => f.severity === "block") ? "block" : findings.some((f) => f.severity === "warn") ? "warn" : "pass";
  return { outcome, findings, ai_labels };
}

// ---------- posters for the variant cards (no network needed) ----------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function poster(label: string, aspect: Aspect, text: string, hue: number): string {
  const [w, h] = aspect === "9:16" ? [180, 320] : aspect === "1:1" ? [240, 240] : [320, 180];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},60%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},65%,18%)"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w / 2}" cy="${h / 2}" r="22" fill="rgba(255,255,255,.18)"/><path d="M${w / 2 - 7} ${h / 2 - 11}l18 11-18 11z" fill="#fff"/><text x="12" y="24" fill="#fff" font-family="Fira Sans,Arial,sans-serif" font-size="13" font-weight="700">${esc(label)}</text><text x="12" y="${h - 30}" fill="#fff" font-family="Fira Sans,Arial,sans-serif" font-size="12">${esc(text.slice(0, 34))}</text><text x="12" y="${h - 12}" fill="rgba(255,255,255,.75)" font-family="Fira Sans,Arial,sans-serif" font-size="10">AI-generated · preview</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
