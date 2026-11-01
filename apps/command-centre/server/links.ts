// Real platform links for each service, and deep links into a client's own accounts.
// Platform URLs are the public sign-in or console URLs of each tool. A deep link opens the
// client's own account when the client's account ID is saved under Connections.
import { catalog } from "./catalog.js";
import type { ClientConnections } from "./connections.js";
import type { ServiceCode } from "./types.js";

export interface Platform {
  id: string;
  name: string;
  url: string;
  what: string;
}

export const PLATFORMS: Record<string, Platform> = {
  meta_ads: { id: "meta_ads", name: "Meta Ads Manager", url: "https://adsmanager.facebook.com/adsmanager/manage/campaigns", what: "Facebook and Instagram ads" },
  meta_business: { id: "meta_business", name: "Meta Business Suite", url: "https://business.facebook.com/latest/home", what: "Pages, Instagram, inbox, planner" },
  meta_events: { id: "meta_events", name: "Meta Events Manager", url: "https://business.facebook.com/events_manager2", what: "Pixel and Conversions API" },
  whatsapp: { id: "whatsapp", name: "WhatsApp Manager", url: "https://business.facebook.com/wa/manage/home", what: "WhatsApp Business templates and numbers" },
  google_ads: { id: "google_ads", name: "Google Ads", url: "https://ads.google.com/aw/overview", what: "Search, Performance Max and YouTube ads" },
  ga4: { id: "ga4", name: "Google Analytics 4", url: "https://analytics.google.com/analytics/web/", what: "Site analytics and conversions" },
  gsc: { id: "gsc", name: "Google Search Console", url: "https://search.google.com/search-console", what: "Organic search performance" },
  gtm: { id: "gtm", name: "Google Tag Manager", url: "https://tagmanager.google.com/", what: "Tags and consent mode" },
  looker: { id: "looker", name: "Looker Studio", url: "https://lookerstudio.google.com/", what: "Client dashboards" },
  linkedin_ads: { id: "linkedin_ads", name: "LinkedIn Campaign Manager", url: "https://www.linkedin.com/campaignmanager/", what: "LinkedIn ads and lead forms" },
  linkedin_sn: { id: "linkedin_sn", name: "LinkedIn Sales Navigator", url: "https://www.linkedin.com/sales/home", what: "Account and buyer lists" },
  tiktok_ads: { id: "tiktok_ads", name: "TikTok Ads Manager", url: "https://ads.tiktok.com/i18n/dashboard", what: "TikTok ads and Spark Ads" },
  tiktok_creators: { id: "tiktok_creators", name: "TikTok One (Creator Marketplace)", url: "https://www.tiktok.com/one", what: "Creator search and briefs" },
  youtube: { id: "youtube", name: "YouTube Studio", url: "https://studio.youtube.com/", what: "Channel uploads and analytics" },
  hubspot: { id: "hubspot", name: "HubSpot", url: "https://app.hubspot.com/", what: "CRM, workflows and email" },
  salesforce: { id: "salesforce", name: "Salesforce", url: "https://login.salesforce.com/", what: "CRM" },
  klaviyo: { id: "klaviyo", name: "Klaviyo", url: "https://www.klaviyo.com/login", what: "B2C email and SMS" },
  mailchimp: { id: "mailchimp", name: "Mailchimp", url: "https://login.mailchimp.com/", what: "Email campaigns" },
  twilio: { id: "twilio", name: "Twilio Console", url: "https://console.twilio.com/", what: "SMS, WhatsApp and Verify" },
  canva: { id: "canva", name: "Canva", url: "https://www.canva.com/", what: "Brand kit and design" },
  figma: { id: "figma", name: "Figma", url: "https://www.figma.com/files", what: "Design files" },
  runway: { id: "runway", name: "Runway", url: "https://app.runwayml.com/", what: "AI video generation" },
  higgsfield: { id: "higgsfield", name: "Higgsfield", url: "https://higgsfield.ai/", what: "AI video with camera motion" },
  heygen: { id: "heygen", name: "HeyGen", url: "https://app.heygen.com/", what: "AI avatars (consent needed)" },
  elevenlabs: { id: "elevenlabs", name: "ElevenLabs", url: "https://elevenlabs.io/app", what: "AI voice (consent needed)" },
  descript: { id: "descript", name: "Descript", url: "https://web.descript.com/", what: "Video editing" },
  frameio: { id: "frameio", name: "Frame.io", url: "https://app.frame.io/", what: "Client video review" },
  semrush: { id: "semrush", name: "Semrush", url: "https://www.semrush.com/projects/", what: "Keywords and site audit" },
  ahrefs: { id: "ahrefs", name: "Ahrefs", url: "https://app.ahrefs.com/dashboard", what: "Backlinks and keywords" },
  bing_ads: { id: "bing_ads", name: "Microsoft Advertising", url: "https://ui.ads.microsoft.com/", what: "Bing and Copilot ads" },
  muckrack: { id: "muckrack", name: "Muck Rack", url: "https://muckrack.com/", what: "Journalist database" },
  cision: { id: "cision", name: "Cision", url: "https://www.cision.com/", what: "Press release distribution" },
  impact: { id: "impact", name: "impact.com", url: "https://app.impact.com/", what: "Affiliate and partner payouts" },
  awin: { id: "awin", name: "Awin", url: "https://ui.awin.com/", what: "Affiliate network" },
  zoom: { id: "zoom", name: "Zoom Webinars", url: "https://zoom.us/signin", what: "Webinars" },
  eventbrite: { id: "eventbrite", name: "Eventbrite", url: "https://www.eventbrite.com/organizations/home", what: "Event registration" },
  hotjar: { id: "hotjar", name: "Hotjar", url: "https://insights.hotjar.com/", what: "Heatmaps and recordings" },
  vwo: { id: "vwo", name: "VWO", url: "https://app.vwo.com/", what: "A/B tests" },
  discord: { id: "discord", name: "Discord", url: "https://discord.com/app", what: "Community server" },
  circle: { id: "circle", name: "Circle", url: "https://login.circle.so/", what: "Community platform" },
  sprout: { id: "sprout", name: "Sprout Social", url: "https://app.sproutsocial.com/", what: "Social publishing and listening" },
};

const BY_SERVICE: Record<ServiceCode, string[]> = {
  email: ["hubspot", "klaviyo", "mailchimp", "ga4"],
  campaigns: ["meta_ads", "google_ads", "linkedin_ads", "tiktok_ads", "ga4", "looker"],
  video: ["runway", "higgsfield", "descript", "frameio", "heygen", "elevenlabs", "youtube"],
  social: ["meta_business", "linkedin_ads", "tiktok_ads", "sprout", "canva"],
  search: ["gsc", "google_ads", "bing_ads", "ga4", "semrush", "ahrefs"],
  influencer: ["tiktok_creators", "meta_business", "meta_ads", "impact"],
  content: ["gsc", "ga4", "semrush", "canva", "figma"],
  abm: ["linkedin_ads", "linkedin_sn", "hubspot", "salesforce"],
  crm_ops: ["hubspot", "salesforce", "gtm", "looker"],
  messaging: ["twilio", "whatsapp", "klaviyo"],
  paid_social: ["meta_ads", "meta_events", "linkedin_ads", "tiktok_ads"],
  analytics: ["ga4", "looker", "gtm", "meta_events"],
  brand: ["canva", "figma", "sprout"],
  pr: ["muckrack", "cision", "gsc"],
  affiliate: ["impact", "awin", "ga4"],
  events: ["zoom", "eventbrite", "hubspot", "linkedin_ads"],
  cro: ["hotjar", "vwo", "ga4", "gtm"],
  community: ["discord", "circle", "meta_business"],
};

const REPO = "https://github.com/a0k02zs/pith-engine";

export interface ServiceLinks {
  platforms: Platform[];
  build_pack: { label: string; url: string }[];
}

export function serviceLinks(code: ServiceCode): ServiceLinks {
  const wf = catalog.workflows.find((w) => w.service === code);
  const folder = wf?.folder ?? code;
  return {
    platforms: (BY_SERVICE[code] ?? []).map((id) => PLATFORMS[id]),
    build_pack: [
      { label: "Service code and docs", url: `${REPO}/tree/main/services/${folder}` },
      { label: "Pipelines (workflow files)", url: `${REPO}/tree/main/services/${folder}/workflows` },
    ],
  };
}

export interface ClientLink {
  platform: string;
  name: string;
  url: string;
  /** true when the link opens the client's own account; false when it opens the tool's home page. */
  deep: boolean;
  needs?: string;
}

const enc = encodeURIComponent;

/** Links into the client's own accounts. Each one is a deep link when the account ID is saved. */
export function clientLinks(conn: ClientConnections): ClientLink[] {
  const m = conn.meta;
  const out: ClientLink[] = [];
  const add = (platform: string, url: string | null, needs: string) =>
    out.push({ platform, name: PLATFORMS[platform].name, url: url ?? PLATFORMS[platform].url, deep: Boolean(url), needs: url ? undefined : needs });
  const act = m.ad_account_id?.replace(/^act_/, "");
  add("meta_ads", act ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${enc(act)}${m.business_id ? `&business_id=${enc(m.business_id)}` : ""}` : null, "Meta ad account ID");
  add("meta_business", m.business_id ? `https://business.facebook.com/latest/home?business_id=${enc(m.business_id)}${m.page_id ? `&asset_id=${enc(m.page_id)}` : ""}` : null, "Meta Business Manager ID");
  add("meta_events", m.pixel_id ? `https://business.facebook.com/events_manager2/list/dataset/${enc(m.pixel_id)}/overview${m.business_id ? `?business_id=${enc(m.business_id)}` : ""}` : null, "Meta pixel (dataset) ID");
  const g = conn.google_ads.customer_id?.replace(/-/g, "");
  add("google_ads", g ? `https://ads.google.com/aw/overview?__c=${enc(g)}` : null, "Google Ads customer ID");
  const p = conn.ga4.property_id;
  add("ga4", p ? `https://analytics.google.com/analytics/web/#/p${enc(p)}/reports/intelligenthome` : null, "GA4 property ID");
  const site = conn.ga4.site_url;
  add("gsc", site ? `https://search.google.com/search-console?resource_id=${enc(site)}` : null, "Website URL");
  const li = conn.linkedin.ad_account_id;
  add("linkedin_ads", li ? `https://www.linkedin.com/campaignmanager/accounts/${enc(li)}/campaigns` : null, "LinkedIn ad account ID");
  const tt = conn.tiktok.advertiser_id;
  add("tiktok_ads", tt ? `https://ads.tiktok.com/i18n/dashboard?aadvid=${enc(tt)}` : null, "TikTok advertiser ID");
  const hs = conn.hubspot.portal_id;
  add("hubspot", hs ? `https://app.hubspot.com/contacts/${enc(hs)}` : null, "HubSpot portal ID");
  return out;
}
