// Pith M sellable packages: region x industry x tier.
// This file is the single source of truth. Run `node packages/build-catalog.mjs` to write
// packages/catalog.json (read by the Command Centre) and packages/MATRIX.md (for people).
//
// Grounding: service package names come from each service build pack (services/*/playbook);
// market rules come from each pack's market rules file and engine/specs/compliance-rules.json.
// PRICES ARE INDICATIVE. The head of growth sets real prices (every service pack says so).
// FX rates are planning assumptions, not live rates. Refresh them before a quote.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const VERSION = "0.1.0";
const AS_OF = "2026-11-06";

// ---------------------------------------------------------------------------------------------
// 1. Service price list (GBP, per month, management fee only; media, creator, venue, wire and
//    message fees pass through at cost). `setup` is a one-off fee. Tier names follow each pack.
// ---------------------------------------------------------------------------------------------
const SERVICES = {
  email: { n: 1, name: "Email marketing", tiers: { starter: ["Starter", 1500], growth: ["Growth", 3000], scale: ["Scale", 6000] } },
  campaigns: { n: 2, name: "Multi-channel campaigns", tiers: { core: ["Core", 2500], growth: ["Growth", 4500], scale: ["Scale", 8000] } },
  video: { n: 3, name: "Video production", tiers: { starter: ["Starter", 2500], b2b_proof: ["B2B Proof", 4000], growth: ["Growth", 6000], hero: ["Hero", 9000] } },
  social: { n: 4, name: "Social media", tiers: { starter: ["Starter", 1800], growth: ["Growth", 3500], scale: ["Scale", 6500] } },
  search: { n: 5, name: "SEO, SEM and GEO", tiers: { foundation: ["Search Foundation", 2500], growth: ["Search Growth", 5000], enterprise: ["Search Enterprise", 9500] } },
  influencer: { n: 6, name: "Influencer marketing", tiers: { seed: ["Seed", 3000], expert: ["Expert", 4500], scale: ["Scale", 7000] } },
  content: { n: 7, name: "Content marketing", tiers: { starter: ["Starter", 2000], growth: ["Growth", 4000], authority: ["Authority", 7500] } },
  abm: { n: 8, name: "Account-based marketing", tiers: { tier3: ["Tier 3 (1-to-many)", 4000], tier2: ["Tier 2 (1-to-few)", 7500], tier1: ["Tier 1 (1-to-1)", 12000] } },
  crm_ops: { n: 9, name: "Marketing automation and CRM ops", tiers: { foundation: ["Foundation + Run", 1800, 12000], growth: ["Growth + Run", 2500, 20000] } },
  messaging: { n: 10, name: "SMS, WhatsApp and push", tiers: { core: ["Core", 1200], growth: ["Growth", 2500], scale: ["Scale", 4500] } },
  paid_social: { n: 11, name: "Performance and paid social", tiers: { core: ["Core", 2500], growth: ["Growth", 4500], scale: ["Scale", 8500] } },
  analytics: { n: 12, name: "Analytics and attribution", tiers: { measure: ["Measure", 1000], attribute: ["Attribute", 2500], optimise: ["Optimise", 5000] } },
  brand: { n: 13, name: "Brand strategy and design", tiers: { a: ["A · Brand-to-brain", 0, 6000], b: ["B · Brand refresh", 0, 18000], c: ["C · Full brand build", 0, 40000] } },
  pr: { n: 14, name: "PR and thought leadership", tiers: { voice: ["Voice", 3000], authority: ["Authority", 6000], category_leader: ["Category leader", 12000] } },
  affiliate: { n: 15, name: "Affiliate and partner", tiers: { grow: ["Launch, then Grow", 2500, 8000], partner: ["Partner (B2B)", 4000, 6000] } },
  events: { n: 16, name: "Events and webinars", tiers: { webinar_starter: ["Webinar Starter", 2500], pipeline: ["Pipeline Webinars", 5500], programme: ["Events Programme", 11000] } },
  cro: { n: 17, name: "CRO and landing pages", tiers: { starter: ["Starter", 2500], growth: ["Growth", 5000], scale: ["Scale", 9000] } },
  community: { n: 18, name: "Community and UGC", tiers: { review_engine: ["Review Engine", 1500], community_builder: ["Community Builder", 3000], ugc_studio: ["UGC Studio", 3500], full_advocacy: ["Full Advocacy", 7000] } },
};

// Every package starts with the same foundation (brand pack: "Package A for every new client";
// analytics pack: "bundled at Measure level into every Pith retainer").
const FOUNDATION = [["brand", "a"], ["analytics", "measure"]];

const TIERS = {
  launch: { name: "Launch", discount: 0.05, term_months: 6, for: "First 6 months in a market. Prove the core channels." },
  growth: { name: "Growth", discount: 0.10, term_months: 12, for: "Proven fit. Add channels, more markets and better attribution." },
  scale: { name: "Scale", discount: 0.15, term_months: 12, for: "Multi-market or category leader. Full mix with orchestration." },
};

// ---------------------------------------------------------------------------------------------
// 2. Industries. Each tier lists [service, service tier] on top of the foundation.
//    `regulated` adds a monthly specialist review line in every region.
// ---------------------------------------------------------------------------------------------
const INDUSTRIES = [
  {
    id: "b2b_saas", name: "SaaS and technology", segment: "B2B",
    examples: "Software, cloud, cybersecurity, data and AI products",
    goal: "Pipeline: MQL to SQL to closed-won, and lower CAC",
    kpis: ["mqls", "sqls", "pipeline_value", "cost_per_sql"],
    tiers: {
      launch: [["search", "foundation"], ["content", "starter"], ["email", "starter"], ["crm_ops", "foundation"], ["paid_social", "core"]],
      growth: [["search", "growth"], ["content", "growth"], ["email", "growth"], ["crm_ops", "growth"], ["paid_social", "growth"], ["cro", "growth"], ["abm", "tier3"], ["events", "webinar_starter"], ["analytics", "attribute"]],
      scale: [["search", "enterprise"], ["content", "authority"], ["email", "scale"], ["crm_ops", "growth"], ["paid_social", "scale"], ["cro", "scale"], ["abm", "tier2"], ["events", "pipeline"], ["pr", "authority"], ["video", "b2b_proof"], ["campaigns", "core"], ["analytics", "optimise"]],
    },
  },
  {
    id: "b2b_services", name: "Professional and financial services", segment: "B2B",
    examples: "Consulting, legal, accounting, B2B fintech, insurance and wealth firms",
    goal: "Trust and authority, then qualified enquiries from senior buyers",
    kpis: ["mqls", "sqls", "share_of_voice", "pipeline_value"],
    regulated: { name: "Financial promotions review", gbp: 900, why: "Financial promotions need sign-off: UK FCA s21 approver, Singapore MAS, US SEC/FINRA rules, each GCC regulator (for example DFSA, CBUAE, SAMA), EU MiFID and national rules." },
    tiers: {
      launch: [["content", "starter"], ["pr", "voice"], ["search", "foundation"], ["email", "starter"], ["crm_ops", "foundation"]],
      growth: [["content", "growth"], ["pr", "authority"], ["search", "foundation"], ["email", "growth"], ["crm_ops", "foundation"], ["social", "starter"], ["paid_social", "core"], ["abm", "tier3"], ["events", "webinar_starter"]],
      scale: [["content", "authority"], ["pr", "category_leader"], ["search", "growth"], ["email", "growth"], ["crm_ops", "growth"], ["social", "growth"], ["paid_social", "growth"], ["abm", "tier2"], ["events", "pipeline"], ["video", "b2b_proof"], ["analytics", "attribute"]],
    },
  },
  {
    id: "b2b_industrial", name: "Industrial, manufacturing and logistics", segment: "B2B",
    examples: "Manufacturers, engineering, construction suppliers, freight and logistics",
    goal: "Distributor and buyer enquiries, trade show pipeline",
    kpis: ["mqls", "sqls", "pipeline_value", "booth_leads"],
    tiers: {
      launch: [["search", "foundation"], ["content", "starter"], ["email", "starter"], ["crm_ops", "foundation"]],
      growth: [["search", "growth"], ["content", "growth"], ["email", "growth"], ["crm_ops", "foundation"], ["cro", "starter"], ["abm", "tier3"], ["video", "b2b_proof"], ["paid_social", "core"], ["affiliate", "partner"]],
      scale: [["search", "enterprise"], ["content", "growth"], ["email", "growth"], ["crm_ops", "growth"], ["cro", "growth"], ["abm", "tier2"], ["video", "b2b_proof"], ["paid_social", "growth"], ["affiliate", "partner"], ["events", "programme"], ["pr", "authority"], ["analytics", "attribute"]],
    },
  },
  {
    id: "b2c_ecommerce", name: "E-commerce and DTC", segment: "B2C",
    examples: "Fashion, beauty, home, consumer electronics, food and drink brands online",
    goal: "Revenue at a target ROAS, repeat purchase and lifetime value",
    kpis: ["revenue", "roas", "new_customer_cpa", "ltv_cac"],
    tiers: {
      launch: [["paid_social", "core"], ["email", "starter"], ["social", "starter"], ["cro", "starter"], ["community", "review_engine"]],
      growth: [["paid_social", "growth"], ["email", "growth"], ["social", "growth"], ["cro", "growth"], ["search", "foundation"], ["community", "ugc_studio"], ["video", "growth"], ["influencer", "seed"], ["messaging", "core"], ["affiliate", "grow"], ["analytics", "attribute"]],
      scale: [["paid_social", "scale"], ["email", "scale"], ["social", "scale"], ["cro", "scale"], ["search", "growth"], ["community", "full_advocacy"], ["video", "growth"], ["influencer", "scale"], ["messaging", "growth"], ["affiliate", "grow"], ["campaigns", "growth"], ["analytics", "optimise"]],
    },
  },
  {
    id: "b2c_hospitality", name: "Hospitality, travel and food and drink", segment: "B2C",
    examples: "Hotels, restaurants, cafes, attractions, tour operators, airlines",
    goal: "Direct bookings and covers, reviews, repeat visits",
    kpis: ["conversions", "revenue", "review_reply_rate", "roas"],
    tiers: {
      launch: [["social", "starter"], ["paid_social", "core"], ["community", "review_engine"], ["search", "foundation"], ["email", "starter"]],
      growth: [["social", "growth"], ["paid_social", "core"], ["community", "ugc_studio"], ["search", "foundation"], ["email", "growth"], ["video", "starter"], ["influencer", "seed"], ["messaging", "core"], ["cro", "starter"]],
      scale: [["social", "scale"], ["paid_social", "growth"], ["community", "ugc_studio"], ["search", "growth"], ["email", "growth"], ["video", "growth"], ["influencer", "scale"], ["messaging", "growth"], ["cro", "growth"], ["pr", "authority"], ["campaigns", "core"], ["analytics", "attribute"]],
    },
  },
  {
    id: "b2c_property", name: "Real estate and property", segment: "B2C",
    examples: "Developers, off-plan launches, estate agents, serviced apartments",
    goal: "Qualified buyer and tenant leads, viewings booked, launch sell-through",
    kpis: ["leads", "cpl", "conversions", "pipeline_value"],
    regulated: { name: "Property advertising checks", gbp: 600, why: "Housing is a special ad category on Meta and Google in the US and Canada (no age, gender or ZIP targeting). Dubai property ads need a Trakheesi permit. UK listings must show material information. Confirm each rule with a local lawyer." },
    tiers: {
      launch: [["paid_social", "core"], ["search", "foundation"], ["cro", "starter"], ["crm_ops", "foundation"], ["messaging", "core"]],
      growth: [["paid_social", "growth"], ["search", "foundation"], ["cro", "growth"], ["crm_ops", "foundation"], ["messaging", "core"], ["video", "starter"], ["email", "growth"], ["social", "starter"], ["events", "webinar_starter"]],
      scale: [["paid_social", "scale"], ["search", "growth"], ["cro", "growth"], ["crm_ops", "growth"], ["messaging", "growth"], ["video", "hero"], ["email", "growth"], ["social", "growth"], ["events", "programme"], ["pr", "authority"], ["campaigns", "core"], ["analytics", "attribute"]],
    },
  },
  {
    id: "b2c_health", name: "Health, wellness and clinics", segment: "B2C",
    examples: "Private clinics, dental, aesthetics, fitness, supplements, health apps",
    goal: "Booked appointments and members, with zero claim breaches",
    kpis: ["leads", "conversions", "cpl", "review_reply_rate"],
    regulated: { name: "Health claims review", gbp: 900, why: "No disease or cure claims without proof. UK MHRA and CAP Code, Singapore HSA, US FDA and FTC, UAE health authority ad permits (DoH, DHA, MOHAP), EU national rules. Weight loss and cosmetic ads: no under-18s." },
    tiers: {
      launch: [["search", "foundation"], ["content", "starter"], ["community", "review_engine"], ["paid_social", "core"]],
      growth: [["search", "foundation"], ["content", "growth"], ["community", "review_engine"], ["paid_social", "core"], ["cro", "starter"], ["email", "growth"], ["social", "starter"], ["video", "starter"], ["messaging", "core"]],
      scale: [["search", "growth"], ["content", "growth"], ["community", "ugc_studio"], ["paid_social", "growth"], ["cro", "growth"], ["email", "growth"], ["social", "growth"], ["video", "growth"], ["messaging", "core"], ["influencer", "seed"], ["pr", "voice"], ["crm_ops", "foundation"]],
    },
  },
  {
    id: "edu", name: "Education and edtech", segment: "B2C",
    examples: "Universities, private schools, language schools, online courses, edtech apps",
    goal: "Applications and enrolments per intake, at a target cost per enrolment",
    kpis: ["leads", "registrations", "conversions", "cpl"],
    regulated: { name: "Education advertising checks", gbp: 400, why: "Claims about outcomes and rankings need proof. Singapore private schools: CPE rules. UAE: KHDA and ADEK rules. Ads to minors are restricted everywhere and banned on profiling in the EU." },
    tiers: {
      launch: [["search", "foundation"], ["paid_social", "core"], ["email", "starter"], ["cro", "starter"]],
      growth: [["search", "foundation"], ["paid_social", "growth"], ["email", "growth"], ["cro", "starter"], ["content", "starter"], ["events", "webinar_starter"], ["messaging", "core"], ["social", "growth"], ["video", "starter"], ["crm_ops", "foundation"], ["influencer", "seed"]],
      scale: [["search", "growth"], ["paid_social", "scale"], ["email", "growth"], ["cro", "growth"], ["content", "growth"], ["events", "pipeline"], ["messaging", "growth"], ["social", "growth"], ["video", "growth"], ["crm_ops", "growth"], ["community", "community_builder"], ["affiliate", "partner"], ["campaigns", "core"], ["analytics", "attribute"]],
    },
  },
];

// ---------------------------------------------------------------------------------------------
// 3. Regions (engine market groups, in launch order). `factor` is the local market rate level
//    against London. `fx` is GBP to local currency (planning assumption as of AS_OF).
//    Add-ons: `when` = all | b2c | b2b | service:<code> | country:<cc>. `required` add-ons are
//    in the package price; optional ones are listed for the sales team.
// ---------------------------------------------------------------------------------------------
const REGIONS = [
  {
    id: "UK", name: "United Kingdom", launch: 1, countries: ["GB"], lead_country: "GB",
    prices: [{ currency: "GBP", symbol: "£", fx: 1, factor: 1.0, label: "UK" }],
    language: "British English. Low-hype, direct tone.",
    channels: { B2B: "LinkedIn first, Google search, email, Meta retargeting", B2C: "Meta, TikTok, Google, Snapchat for under-25s, email" },
    compliance: ["UK GDPR and PECR (Data (Use and Access) Act 2025 raises PECR fines)", "CAP Code and ASA: evidence before claims; \"Ad\" on paid creator posts", "Less healthy food and drink: paid online ads banned from 5 Jan 2026", "FCA s21 approval for financial promotions"],
    key_dates: "January sales, Black Friday, Christmas. B2B: push in January and September.",
    addons: [
      { id: "uk_compliance", name: "UK consent and claims pack (PECR audit, claims register)", gbp: 0, when: "all", required: true, note: "Included" },
    ],
    priority: { b2b_saas: ["high", "Largest B2B tech market in the launch set; English only"], b2b_services: ["high", "London financial and professional hub"], b2b_industrial: ["medium", "Strong in the Midlands and North; longer cycles"], b2c_ecommerce: ["high", "Mature online retail; Meta and TikTok scale"], b2c_hospitality: ["medium", "HFSS online ad ban limits food and drink ads"], b2c_property: ["medium", "Portal-led market; strong for developers and lettings"], b2c_health: ["medium", "Private clinics and aesthetics grow; strict CAP rules"], edu: ["high", "International student recruitment and online courses"] },
  },
  {
    id: "SG", name: "Singapore", launch: 2, countries: ["SG"], lead_country: "SG",
    prices: [{ currency: "SGD", symbol: "S$", fx: 1.72, factor: 0.9, label: "Singapore" }],
    language: "English first. Mandarin, Malay or Tamil versions for some B2C audiences. Practical, value-led tone.",
    channels: { B2B: "LinkedIn, Google search, email, Meta retargeting", B2C: "Meta (Facebook still strong), Instagram, TikTok, WhatsApp" },
    compliance: ["PDPA 2012: consent and notified purpose", "Do Not Call Registry check before SMS, WhatsApp or calls", "Spam Control Act: <ADV> label on bulk messages", "ASAS Code; HSA for health; MAS for financial products", "SSIR sender ID registration for SMS"],
    key_dates: "Chinese New Year, Hari Raya Puasa, Deepavali, 9.9, 11.11, 12.12, Great Singapore Sale.",
    addons: [
      { id: "sg_multilingual", name: "Multilingual pack (Mandarin and Malay versions of key B2C assets)", gbp: 900, when: "b2c", required: true },
      { id: "sg_dnc", name: "DNC Registry checks and SSIR sender ID setup", gbp: 0, setup: 600, when: "service:messaging", required: true },
      { id: "sg_tamil", name: "Tamil versions", gbp: 400, when: "b2c", required: false },
    ],
    priority: { b2b_saas: ["high", "Regional HQ hub for APAC tech buyers"], b2b_services: ["high", "Fintech and wealth hub (MAS-regulated)"], b2b_industrial: ["medium", "Logistics and port hub; few factories"], b2c_ecommerce: ["medium", "Small market; Shopee and Lazada take much of the demand"], b2c_hospitality: ["medium", "Tourism recovery; very competitive F&B"], b2c_property: ["low", "Cooling measures and strict agent rules limit spend"], b2c_health: ["medium", "Aesthetics and wellness; HSA rules"], edu: ["high", "Private education and tuition spend is high"] },
  },
  {
    id: "NA", name: "North America (US and Canada)", launch: 3, countries: ["US", "CA"], lead_country: "US",
    prices: [
      { currency: "USD", symbol: "US$", fx: 1.30, factor: 1.2, label: "United States" },
      { currency: "CAD", symbol: "C$", fx: 1.80, factor: 1.0, label: "Canada" },
    ],
    language: "US English (US). Canadian English (Canada). French first for Quebec.",
    channels: { B2B: "LinkedIn, Google search, email, G2 and review sites", B2C: "Meta, Google, TikTok (check US status each campaign), Snapchat, SMS" },
    compliance: ["FTC Act, Endorsement Guides and fake-review rule", "CAN-SPAM; TCPA written consent for SMS", "CCPA/CPRA and Global Privacy Control before pixels", "Special ad categories: housing, jobs, credit and finance (US and CA)", "Canada: CASL consent before the first email or SMS; PIPEDA; Competition Act (no drip pricing)", "Quebec: Charter of the French Language and Law 25"],
    key_dates: "Super Bowl, July 4, Thanksgiving, Black Friday and Cyber Monday; Canada Day, Canadian Thanksgiving.",
    addons: [
      { id: "na_us_privacy", name: "US privacy and TCPA setup (GPC, state opt-outs, SMS consent capture)", gbp: 0, setup: 1500, when: "country:US", required: true },
      { id: "na_casl", name: "CASL consent audit and records", gbp: 0, setup: 1000, when: "country:CA", required: true },
      { id: "na_quebec", name: "Quebec French pack (native French copy, ads and pages)", gbp: 1200, when: "country:CA", required: true, note: "Required only if the client sells in Quebec" },
      { id: "na_spanish", name: "US Spanish versions", gbp: 900, when: "b2c", required: false },
    ],
    priority: { b2b_saas: ["high", "Biggest SaaS buyer market; high ACVs"], b2b_services: ["medium", "Large, but SEC/FINRA rules add review time"], b2b_industrial: ["medium", "Reshoring demand; long cycles"], b2c_ecommerce: ["high", "Largest DTC market; higher CPMs"], b2c_hospitality: ["medium", "Fragmented; strong for multi-site groups"], b2c_property: ["medium", "Special ad category limits targeting"], b2c_health: ["low", "FDA, FTC and HIPAA risk; start later"], edu: ["medium", "Online courses and bootcamps; crowded"] },
  },
  {
    id: "GCC", name: "Middle East (GCC)", launch: 4, countries: ["AE", "SA", "QA", "KW", "BH", "OM"], lead_country: "AE",
    prices: [
      { currency: "AED", symbol: "AED ", fx: 4.77, factor: 1.1, label: "UAE (also QAR, KWD, BHD, OMR on request)" },
      { currency: "SAR", symbol: "SAR ", fx: 4.87, factor: 1.1, label: "Saudi Arabia" },
    ],
    language: "English for most B2B. Gulf Arabic for B2C and government-linked buyers, with right-to-left layouts. Respectful, premium, relationship-first tone.",
    channels: { B2B: "LinkedIn, Google search, email, events and roadshows", B2C: "Snapchat (very strong in Saudi Arabia), Instagram, TikTok, WhatsApp, X (Saudi Arabia, Kuwait)" },
    compliance: ["A data law per country (UAE PDPL plus DIFC and ADGM, Saudi PDPL with transfer limits, Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA)", "Creator licences: UAE Media Council advertiser permit, Saudi Mawthooq", "Registered SMS sender IDs and send-time limits", "Respect religion, culture and public morals; no alcohol, gambling or dating products", "Trademark filing in each country"],
    key_dates: "Ramadan and Eid (dates move; ad costs rise), Saudi National Day (23 Sep), UAE National Day (2 Dec), White Friday, Dubai Shopping Festival. Weekend: Sat-Sun UAE, Fri-Sat elsewhere.",
    addons: [
      { id: "gcc_arabic", name: "Arabic and RTL pack (native Gulf Arabic copy, RTL pages and creative)", gbp: 1500, when: "b2c", required: true },
      { id: "gcc_arabic_b2b", name: "Arabic and RTL pack for B2B (government-linked buyers)", gbp: 1500, when: "b2b", required: false },
      { id: "gcc_creator_licence", name: "Creator licence checks (Media Council, Mawthooq)", gbp: 0, when: "service:influencer", required: true, note: "Included" },
      { id: "gcc_sender_id", name: "SMS and WhatsApp sender ID registration", gbp: 0, setup: 800, when: "service:messaging", required: true },
      { id: "gcc_ksa_data", name: "Saudi data transfer review (PDPL)", gbp: 0, setup: 1500, when: "country:SA", required: true },
    ],
    priority: { b2b_saas: ["medium", "Digital transformation budgets; relationship-led sales"], b2b_services: ["high", "DIFC, ADGM and Riyadh financial centres grow fast"], b2b_industrial: ["medium", "Construction, energy and logistics; tender-led"], b2c_ecommerce: ["high", "High spend per head; Snapchat and TikTok reach"], b2c_hospitality: ["high", "Tourism push (UAE, Saudi Vision 2030)"], b2c_property: ["high", "Dubai and Riyadh off-plan launches; buyers abroad too"], b2c_health: ["medium", "Aesthetics and clinics; ad permits needed"], edu: ["medium", "Private schools and universities; KHDA and ADEK rules"] },
  },
  {
    id: "EU", name: "European Union", launch: 5, countries: ["NL", "DE", "FR", "IE", "SE", "DK", "BE", "ES", "IT"], lead_country: "NL",
    prices: [{ currency: "EUR", symbol: "€", fx: 1.17, factor: 1.0, label: "EU (start in the Netherlands)" }],
    language: "Start in 1 or 2 lead countries. English works for Dutch and Nordic B2B. German, French and Spanish need native translation. Factual tone.",
    channels: { B2B: "LinkedIn, Google search, email, trade shows", B2C: "Meta, Google, TikTok, Snapchat, email" },
    compliance: ["GDPR and ePrivacy: no pixel before cookie consent (Germany is strict)", "Article 14 notice for third-party data", "DSA: no ads profiling minors or using sensitive data", "EU AI Act Article 50 labels on AI content from 2 Aug 2026", "No political or social issue ads (TTPA)", "Unfair Commercial Practices Directive; national creator laws (France 2023)"],
    key_dates: "Black Friday, Christmas, summer sales, King's Day (NL, 27 April). B2B: avoid August.",
    addons: [
      { id: "eu_gdpr_ai", name: "GDPR and AI Act labelling setup", gbp: 0, setup: 1500, when: "all", required: true },
      { id: "eu_language", name: "Extra language pack (per language, for example German or French)", gbp: 1000, when: "b2c", required: true, note: "1 extra language included in the B2C price; add 1,000 a month for each more" },
      { id: "eu_language_b2b", name: "Extra language pack for B2B (per language)", gbp: 1000, when: "b2b", required: false },
    ],
    priority: { b2b_saas: ["high", "Dutch and Nordic buyers accept English; big SaaS spend"], b2b_services: ["medium", "Fragmented national rules"], b2b_industrial: ["high", "Germany and Benelux manufacturing; trade shows"], b2c_ecommerce: ["medium", "Language and consent costs per country"], b2c_hospitality: ["low", "Local, language-heavy; low margin for an agency"], b2c_property: ["low", "National markets; little cross-border buying"], b2c_health: ["low", "Strict national health ad rules"], edu: ["medium", "English-taught programmes in NL and Ireland"] },
  },
];

// ---------------------------------------------------------------------------------------------
// 4. Build
// ---------------------------------------------------------------------------------------------
const round = (v, step) => Math.round(v / step) * step;
const stepFor = (currency) => (["GBP", "EUR", "USD"].includes(currency) ? 50 : 100);

function addonApplies(a, ind, services, country) {
  if (a.when === "all") return true;
  if (a.when === "b2c") return ind.segment === "B2C";
  if (a.when === "b2b") return ind.segment === "B2B";
  if (a.when.startsWith("service:")) return services.includes(a.when.slice(8));
  if (a.when.startsWith("country:")) return a.when.slice(8) === country;
  return false;
}

function line(code, tier) {
  const s = SERVICES[code];
  const t = s?.tiers[tier];
  if (!t) throw new Error(`Unknown service tier ${code}.${tier}`);
  return { service: code, number: s.n, service_name: s.name, tier, tier_name: t[0], monthly_gbp: t[1], setup_gbp: t[2] ?? 0 };
}

function buildPackage(region, ind, tierKey) {
  const t = TIERS[tierKey];
  // Industry tier lines replace the foundation line of the same service (for example analytics
  // Attribute replaces Measure), so a service is never counted twice.
  const own = ind.tiers[tierKey].map(([c, k]) => line(c, k));
  const lines = [...FOUNDATION.filter(([c]) => !own.some((l) => l.service === c)).map(([c, k]) => ({ ...line(c, k), foundation: true })), ...own]
    .sort((a, b) => a.number - b.number);
  const codes = lines.map((l) => l.service);
  const list_monthly = lines.reduce((s, l) => s + l.monthly_gbp, 0);
  const discount = round(list_monthly * t.discount, 50);
  const regulated = ind.regulated ? { id: `${ind.id}_review`, name: ind.regulated.name, gbp: ind.regulated.gbp, setup: 0, required: true, why: ind.regulated.why } : null;

  const prices = region.prices.map((p) => {
    const country = p.currency === "CAD" ? "CA" : p.currency === "SAR" ? "SA" : p.currency === "USD" ? "US" : region.lead_country;
    const addons = region.addons.filter((a) => a.required && addonApplies(a, ind, codes, country));
    const addon_monthly = addons.reduce((s, a) => s + (a.gbp ?? 0), 0) + (regulated?.gbp ?? 0);
    const addon_setup = addons.reduce((s, a) => s + (a.setup ?? 0), 0);
    const setup_gbp = lines.reduce((s, l) => s + l.setup_gbp, 0) + addon_setup;
    const monthly_gbp = list_monthly - discount + addon_monthly;
    const k = p.factor * p.fx;
    const step = stepFor(p.currency);
    return {
      currency: p.currency, symbol: p.symbol, label: p.label, country,
      monthly: round(monthly_gbp * k, step),
      setup: round(setup_gbp * k, step),
      first_year: round(monthly_gbp * k, step) * 12 + round(setup_gbp * k, step),
      monthly_gbp_equiv: round(monthly_gbp * p.factor, 50),
      addons: [...addons.map((a) => ({ id: a.id, name: a.name, monthly: round((a.gbp ?? 0) * k, step), setup: round((a.setup ?? 0) * k, step), note: a.note ?? null })),
        ...(regulated ? [{ id: regulated.id, name: regulated.name, monthly: round(regulated.gbp * k, step), setup: 0, note: null }] : [])],
    };
  });

  return {
    id: `${region.id}.${ind.id}.${tierKey}`,
    region: region.id, industry: ind.id, tier: tierKey,
    name: `${ind.name} · ${t.name} · ${region.id}`,
    term_months: t.term_months,
    priority: region.priority[ind.id][0],
    lines,
    list_monthly_gbp: list_monthly,
    bundle_discount_gbp: discount,
    prices,
  };
}

const packages = [];
for (const r of REGIONS) for (const ind of INDUSTRIES) for (const tk of Object.keys(TIERS)) packages.push(buildPackage(r, ind, tk));

const catalog = {
  version: VERSION,
  as_of: AS_OF,
  status: "indicative",
  notes: [
    "Prices are indicative list prices for planning and sales conversations. The head of growth sets final prices.",
    "Fees are Pith management fees. Media, creator, venue, wire, platform and message fees pass through at cost with no mark-up.",
    "Every package includes Brand package A (brand-to-brain, one-off) and Analytics Measure (monthly). No client work starts until the client brain is live.",
    "FX rates are planning assumptions as of the as_of date. Refresh them before a written quote.",
    "Market and industry rules are planning summaries, not legal advice. A local lawyer confirms each market before the first campaign.",
  ],
  tiers: TIERS,
  services: Object.fromEntries(Object.entries(SERVICES).map(([k, s]) => [k, { number: s.n, name: s.name, tiers: Object.fromEntries(Object.entries(s.tiers).map(([tk, t]) => [tk, { name: t[0], monthly_gbp: t[1], setup_gbp: t[2] ?? 0 }])) }])),
  foundation: FOUNDATION.map(([s, t]) => ({ service: s, tier: t })),
  industries: INDUSTRIES.map(({ tiers, ...rest }) => rest),
  regions: REGIONS.map(({ addons, ...rest }) => ({ ...rest, addons })),
  packages,
};

writeFileSync(join(here, "catalog.json"), JSON.stringify(catalog, null, 1) + "\n");

// ---------------------------------------------------------------------------------------------
// 5. MATRIX.md for people
// ---------------------------------------------------------------------------------------------
const fmt = (p, v) => `${p.symbol}${v.toLocaleString("en-GB")}`;
const md = [];
md.push(`# Pith M packages by region and industry`, ``, `Version ${VERSION} · ${AS_OF} · **Indicative prices**. Generated by \`packages/build-catalog.mjs\`. Do not edit by hand.`, ``);
for (const n of catalog.notes) md.push(`- ${n}`);
md.push(``, `## How a package is built`, ``, `Package = foundation (Brand A + Analytics Measure) + the industry service mix for the tier + required regional add-ons + any industry compliance review. Bundle discount: Launch 5%, Growth 10%, Scale 15% on the service list price.`, ``);
md.push(`## Where to lead: priority by region and industry`, ``, `| Industry | ${REGIONS.map((r) => r.id).join(" | ")} |`, `|---|${REGIONS.map(() => "---").join("|")}|`);
for (const ind of INDUSTRIES) md.push(`| ${ind.name} (${ind.segment}) | ${REGIONS.map((r) => r.priority[ind.id][0]).join(" | ")} |`);
md.push(``, `Priority is a planning judgement from each market's rules and channel fit. Reasons are in \`catalog.json\` (regions[].priority).`, ``);
md.push(`## Services in each industry tier`, ``);
for (const ind of INDUSTRIES) {
  md.push(`### ${ind.name} (${ind.segment})`, ``, `${ind.examples}. Goal: ${ind.goal}.${ind.regulated ? ` Regulated: ${ind.regulated.name} is included in every region.` : ""}`, ``, `| Tier | Services (on top of Brand A and Analytics Measure) |`, `|---|---|`);
  for (const tk of Object.keys(TIERS)) md.push(`| ${TIERS[tk].name} | ${ind.tiers[tk].map(([c, k]) => `${SERVICES[c].name} (${SERVICES[c].tiers[k][0]})`).join("; ")} |`);
  md.push(``);
}
md.push(`## Monthly price by region (indicative)`, ``);
for (const r of REGIONS) {
  md.push(`### ${r.name} (launch ${r.launch})`, ``, `${r.language}`, ``, `- B2B channels: ${r.channels.B2B}`, `- B2C channels: ${r.channels.B2C}`, `- Rules: ${r.compliance.join("; ")}`, ``);
  for (const p of r.prices) {
    md.push(`**${p.label} (${p.currency})** · monthly fee, then one-off setup in brackets`, ``, `| Industry | Priority | Launch | Growth | Scale |`, `|---|---|---|---|---|`);
    for (const ind of INDUSTRIES) {
      const cells = Object.keys(TIERS).map((tk) => {
        const pk = packages.find((x) => x.id === `${r.id}.${ind.id}.${tk}`);
        const pr = pk.prices.find((x) => x.currency === p.currency);
        return `${fmt(p, pr.monthly)} (${fmt(p, pr.setup)})`;
      });
      md.push(`| ${ind.name} | ${r.priority[ind.id][0]} | ${cells.join(" | ")} |`);
    }
    md.push(``);
  }
  md.push(`Regional add-ons:`, ``);
  for (const a of r.addons) md.push(`- ${a.name}: ${a.required ? "required" : "optional"} (${a.when})${a.gbp ? `, £${a.gbp.toLocaleString("en-GB")} a month before the regional factor` : ""}${a.setup ? `, £${a.setup.toLocaleString("en-GB")} one-off` : ""}${a.note ? `. ${a.note}` : ""}`);
  md.push(``);
}
writeFileSync(join(here, "MATRIX.md"), md.join("\n"));
console.log(`packages: ${packages.length} (${REGIONS.length} regions x ${INDUSTRIES.length} industries x ${Object.keys(TIERS).length} tiers)`);
