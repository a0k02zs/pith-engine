// Custom strategy for each client. Built from the client brain (who they are, who they sell to,
// goals, budget), the client's markets (compliance-rules.json) and the pipelines of each service
// the client buys (services/*/workflows). The plan is deterministic, so it is the same every time
// for the same inputs. "Improve with Claude" can add notes on top, on the server only.
import { catalog, complianceFor, marketGroupOf, serviceInfo } from "./catalog.js";
import type { Client, MetricRow, ServiceCode } from "./types.js";

export interface ClientBrain {
  positioning: string;
  audience: string;
  goals: string[];
  monthly_budget: number;
  tone: string;
  competitors: string[];
  offers: string[];
  notes: string;
  updated_at: string | null;
}

const BRAINS: Record<string, Omit<ClientBrain, "updated_at">> = {
  "Northwind Analytics (test)": {
    positioning: "Self-serve product analytics for mid-market SaaS teams that outgrew spreadsheets.",
    audience: "Heads of Product and Growth at 50-500 person SaaS companies in the UK, Netherlands and Germany.",
    goals: ["Grow sales-qualified pipeline", "Lower cost per demo", "Win 20 named target accounts"],
    monthly_budget: 38000, tone: "Clear, expert, no hype", competitors: ["Amplitude", "Mixpanel", "Heap"],
    offers: ["14-day free trial", "Benchmark report"], notes: "Sales cycle is 45-60 days. German buyers want data residency proof.",
  },
  "Lumen Skincare (test)": {
    positioning: "Clinically tested, fragrance-free skincare for sensitive skin in humid climates.",
    audience: "Women 22-40 in Singapore and the UK who buy skincare online and follow creators.",
    goals: ["Grow online revenue", "Raise repeat purchase rate", "Build creator community"],
    monthly_budget: 52000, tone: "Warm, calm, science-backed", competitors: ["La Roche-Posay", "CeraVe", "Glow Recipe"],
    offers: ["Starter kit", "Subscribe and save 15%"], notes: "Every health claim needs the clinical study reference.",
  },
  "Atlas Freight (test)": {
    positioning: "Digital freight forwarding with live tracking for US and Canadian mid-size shippers.",
    audience: "Logistics and supply chain managers at manufacturers and distributors shipping 50+ loads a month.",
    goals: ["Grow qualified pipeline", "Break into 15 enterprise accounts", "Rank for freight quote searches"],
    monthly_budget: 45000, tone: "Direct, reliable, practical", competitors: ["Flexport", "Freightos", "Convoy"],
    offers: ["Instant quote", "Free lane audit"], notes: "Quebec content needs French. Trade shows matter in Q1.",
  },
  "Dune Hospitality (test)": {
    positioning: "Boutique desert and beach resorts with local culture and private experiences.",
    audience: "High-income travellers and families in the GCC, plus inbound travellers planning Gulf trips.",
    goals: ["Grow direct bookings", "Lower OTA share", "Fill shoulder season"],
    monthly_budget: 60000, tone: "Elegant, welcoming, bilingual (Arabic and English)", competitors: ["Jumeirah", "Rotana", "Booking.com"],
    offers: ["Book direct and get a spa credit", "Ramadan and Eid packages"], notes: "Influencers need a UAE Media Council permit or a Saudi Mawthooq licence.",
  },
};

export function seedBrain(client: Client): ClientBrain {
  const b = BRAINS[client.name] ?? {
    positioning: "", audience: "", goals: ["Grow revenue"], monthly_budget: 20000, tone: "", competitors: [], offers: [], notes: "",
  };
  return { ...b, goals: [...b.goals], competitors: [...b.competitors], offers: [...b.offers], updated_at: null };
}

// What each service does for this client, per business model. Plain-language reasons the plan shows.
const WHY: Record<ServiceCode, { B2B: string; B2C: string; cadence: string; weight: number }> = {
  email: { B2B: "Nurture trial users and leads to a demo with lifecycle flows.", B2C: "Turn first buyers into repeat buyers with flows and weekly campaigns.", cadence: "Flows always on, 1-2 campaigns a week", weight: 0.6 },
  campaigns: { B2B: "Run quarterly launch campaigns across paid, email and events.", B2C: "Run seasonal campaigns across paid, social and messaging.", cadence: "1 major campaign a quarter", weight: 1.4 },
  video: { B2B: "Make short product explainers and customer proof clips.", B2C: "Make short-form ads and creator cut-downs for every channel.", cadence: "4-8 assets a month", weight: 0.7 },
  social: { B2B: "Build thought leadership on LinkedIn for the brand and leaders.", B2C: "Post daily on Instagram and TikTok to grow reach and saves.", cadence: "B2B 3 posts a week, B2C 1-2 a day", weight: 0.5 },
  search: { B2B: "Win high-intent searches with SEO pages, paid search and AI answers (GEO).", B2C: "Capture brand and category searches; keep the brand in AI answers.", cadence: "Weekly SEO sprint, daily bid checks", weight: 1.2 },
  influencer: { B2B: "Use analysts and practitioners as voices.", B2C: "Run creator programmes with clear paid-partnership labels.", cadence: "Monthly creator waves", weight: 1.0 },
  content: { B2B: "Publish guides, benchmarks and comparison pages that feed sales.", B2C: "Publish routines, ingredient guides and gift guides.", cadence: "4-6 pieces a month", weight: 0.6 },
  abm: { B2B: "Target the named account list with ads, content and sales plays.", B2C: "Target key partner and corporate accounts.", cadence: "Weekly account review", weight: 1.1 },
  crm_ops: { B2B: "Keep lead scoring, routing and CRM data clean so sales trusts the leads.", B2C: "Keep customer data, consent and segments clean.", cadence: "Weekly data health check", weight: 0.4 },
  messaging: { B2B: "Send event and demo reminders by SMS and WhatsApp with consent.", B2C: "Send restock, offer and booking messages on WhatsApp and SMS with consent.", cadence: "Triggered, plus 2 broadcasts a month", weight: 0.5 },
  paid_social: { B2B: "Run LinkedIn and Meta ads to target accounts and lookalikes.", B2C: "Run Meta and TikTok ads with fresh creative every 2 weeks.", cadence: "Daily pacing, weekly creative refresh", weight: 2.2 },
  analytics: { B2B: "Measure pipeline by channel and report it each week.", B2C: "Measure revenue, ROAS and repeat rate by channel.", cadence: "Weekly report, monthly review", weight: 0.3 },
  brand: { B2B: "Keep one voice and visual system in every service.", B2C: "Keep one voice, look and claims list in every service.", cadence: "Brand check on every asset", weight: 0.3 },
  pr: { B2B: "Earn coverage in trade and business press with data stories.", B2C: "Earn lifestyle and travel press and expert quotes.", cadence: "1-2 pitches a month", weight: 0.6 },
  affiliate: { B2B: "Grow partner and referral programmes.", B2C: "Grow affiliate and loyalty partners with tracked payouts.", cadence: "Monthly payout run", weight: 0.6 },
  events: { B2B: "Run webinars and trade-show plays that book meetings.", B2C: "Run launch events and pop-ups.", cadence: "1 webinar a month", weight: 0.7 },
  cro: { B2B: "Test demo and pricing pages to raise lead conversion.", B2C: "Test product, booking and checkout pages to raise conversion.", cadence: "2 tests a month", weight: 0.5 },
  community: { B2B: "Run a user community for product feedback and advocacy.", B2C: "Run a member community for reviews and repeat buyers.", cadence: "Daily moderation, weekly prompt", weight: 0.4 },
};

const UPLIFT: Record<string, number> = { leads: 0.25, mqls: 0.25, sqls: 0.3, revenue: 0.2, meetings_booked: 0.3, pipeline_value: 0.3, clicks: 0.15, impressions: 0.2, reach: 0.2 };

export interface StrategyPlay {
  service: ServiceCode;
  service_name: string;
  why: string;
  cadence: string;
  pipelines: Array<{ id: string; description: string }>;
  kpis: string[];
  budget: number;
  budget_pct: number;
}

export interface Strategy {
  client_id: string;
  version: number;
  generated_at: string;
  source: "playbooks" | "playbooks+claude";
  summary: string;
  positioning: string;
  audience: string;
  objectives: Array<{ goal: string; kpi: string; baseline_28d: number; target_28d: number; by: string }>;
  markets: Array<{ country: string; group: string | null; phase: number; laws: string[]; disclosure_labels: string[]; key_rules: Array<{ id: string; severity: string; message: string }> }>;
  plays: StrategyPlay[];
  budget: { monthly: number; currency: string };
  roadmap: Array<{ phase: string; focus: string; items: string[] }>;
  risks: string[];
  claude_notes: { summary: string; quick_wins: string[]; risks: string[]; play_notes: Record<string, string> } | null;
  status: "draft" | "in_review" | "approved" | "changes_requested" | "rejected";
  approval_id: string | null;
}

const firstSentence = (s: string) => (s.split(/(?<=\.)\s/)[0] ?? s).trim();

// Platform-specific pipelines that do not fit a business model.
const NOT_FOR: Record<Client["model"], RegExp> = { B2B: /snapchat|tiktok|pinterest/, B2C: /linkedin/ };

function pickPipelines(code: ServiceCode, model: Client["model"]) {
  const seen = new Set<string>();
  const wfs = catalog.workflows.filter((w) => w.service === code && !NOT_FOR[model].test(w.id) && !/crisis|escalat/.test(w.id)).filter((w) => {
    // Keep one pipeline per family, for example 1 of creative_refresh_meta / _linkedin / _snapchat.
    const stem = w.id.replace(/_(meta|linkedin|snapchat|tiktok|google|pinterest|x|youtube)$/, "");
    if (seen.has(stem)) return false;
    seen.add(stem);
    return true;
  });
  const manual = wfs.filter((w) => w.trigger.manual);
  return [...manual, ...wfs.filter((w) => !w.trigger.manual)].slice(0, 3).map((w) => ({ id: w.id, description: firstSentence(w.description) }));
}

export function buildStrategy(client: Client, brain: ClientBrain, metrics: MetricRow[], now: number, version = 1): Strategy {
  const since = new Date(now - 28 * 864e5).toISOString().slice(0, 10);
  const recent = metrics.filter((m) => m.client_id === client.id && m.date >= since);
  const total = (kpi: string, svc?: ServiceCode) => recent.filter((m) => m.kpi === kpi && (!svc || m.service === svc)).reduce((a, m) => a + m.value, 0);

  // Markets in the Pith launch order (UK, SG, NA, GCC, EU). Phase 1 is the first group.
  const order = catalog.market_launch_order;
  const markets = [...client.markets]
    .sort((a, b) => order.indexOf(marketGroupOf(a) ?? "") - order.indexOf(marketGroupOf(b) ?? "") || client.markets.indexOf(a) - client.markets.indexOf(b))
    .map((country, i) => {
      const r = complianceFor(country);
      const key = (r?.rules ?? []).filter((x) => x.severity === "block").slice(0, 4);
      return {
        country, group: marketGroupOf(country) ?? null, phase: i === 0 ? 1 : i === 1 ? 2 : 3,
        laws: r?.laws ?? [], disclosure_labels: r?.disclosure_labels ?? [],
        key_rules: key.map((x) => ({ id: x.id, severity: x.severity, message: x.message })),
      };
    });

  const weights = client.services.map((s) => WHY[s].weight);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const plays: StrategyPlay[] = client.services.map((code, i) => {
    const info = serviceInfo(code);
    const pct = Math.round((weights[i] / wsum) * 1000) / 10;
    return {
      service: code, service_name: info.name, why: WHY[code][client.model], cadence: WHY[code].cadence,
      pipelines: pickPipelines(code, client.model), kpis: info.kpis, budget: Math.round((brain.monthly_budget * weights[i]) / wsum), budget_pct: pct,
    };
  }).sort((a, b) => b.budget - a.budget);

  const headline = client.model === "B2B" ? ["sqls", "meetings_booked", "pipeline_value", "leads"] : ["revenue", "conversions", "reach", "clicks"];
  const tracked = new Set(recent.map((m) => m.kpi));
  const objectives = brain.goals.slice(0, 3).map((goal, i) => {
    const kpi = headline.filter((k) => tracked.has(k))[i] ?? [...tracked][i] ?? "leads";
    const base = Math.round(total(kpi));
    return { goal, kpi, baseline_28d: base, target_28d: Math.round(base * (1 + (UPLIFT[kpi] ?? 0.2))), by: "Day 90" };
  });

  const first = markets.filter((m) => m.phase === 1).map((m) => m.country);
  const later = markets.filter((m) => m.phase > 1).map((m) => m.country);
  const top = plays.slice(0, 3).map((p) => p.service_name);
  const hasAiVideo = client.services.includes("video");
  const eu = markets.some((m) => m.group === "EU");
  const gcc = markets.some((m) => m.group === "GCC");

  const risks = [
    ...(eu ? ["EU AI Act Art. 50: label realistic AI images and video. Collect GDPR consent before tracking."] : []),
    ...(gcc ? ["GCC: influencers need a local licence (UAE Media Council, Saudi Mawthooq). Arabic copy for B2C."] : []),
    ...(markets.some((m) => m.country === "US" || m.country === "CA") ? ["North America: FTC endorsement rules, CAN-SPAM and CASL consent for email and SMS."] : []),
    ...(hasAiVideo ? ["AI video: written consent before any real person's face or voice is used (G8)."] : []),
    ...(brain.notes ? [brain.notes] : []),
  ];

  return {
    client_id: client.id, version, generated_at: new Date(now).toISOString(), source: "playbooks",
    summary: `${client.name.replace(" (test)", "")}: ${brain.positioning || client.industry} Lead with ${top.join(", ")}. Launch in ${first.join(", ")} first${later.length ? `, then ${later.join(", ")}` : ""}. Budget ${client.currency} ${brain.monthly_budget.toLocaleString("en-GB")} a month across ${plays.length} services.`,
    positioning: brain.positioning, audience: brain.audience, objectives, markets, plays,
    budget: { monthly: brain.monthly_budget, currency: client.currency },
    roadmap: [
      { phase: "Days 1-30", focus: `Set up and launch in ${first.join(", ")}`, items: [
        "Connect Meta, Google, GA4 and the CRM under Connections; check tracking and consent.",
        "Write the brand brain into every service (voice, claims list, banned words).",
        `Start ${plays.slice(0, 2).map((p) => p.pipelines[0]?.id).filter(Boolean).join(" and ")}.`,
        `Apply ${first.map((c) => markets.find((m) => m.country === c)!.laws[0]).filter(Boolean).join(", ")} rules before the first send.`,
      ] },
      { phase: "Days 31-60", focus: later.length ? `Scale and open ${later.join(", ")}` : "Scale what works", items: [
        "Move budget to the plays that beat target by 10% or more.",
        "Run 2 conversion tests and refresh ad creative every 2 weeks.",
        ...(hasAiVideo ? ["Make AI ad variants in Video studio and test them head to head."] : []),
      ] },
      { phase: "Days 61-90", focus: "Optimise and report", items: [
        "Cut the bottom 20% of spend by cost per result.",
        "Review results against the targets with the client and agree the next quarter.",
      ] },
    ],
    risks, claude_notes: null, status: "draft", approval_id: null,
  };
}

/** Input for the optional Claude step. Server only: main.ts registers it when ANTHROPIC_API_KEY is set. */
export type StrategyImprover = (input: { client: Client; brain: ClientBrain; strategy: Strategy }) => Promise<NonNullable<Strategy["claude_notes"]>>;
