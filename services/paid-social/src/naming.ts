/** Naming convention (docs/templates/naming-convention.md). Names are lower case; parts use a-z, 0-9 and "-" and are joined with "_". */

export const STAGES = ["prospect", "retarget", "retain"] as const;
export type Stage = (typeof STAGES)[number];

const PART = /^[a-z0-9-]+$/;

export function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function join(parts: string[]): string {
  const clean = parts.map(slug);
  clean.forEach((p, i) => {
    if (!PART.test(p)) throw new Error(`Empty name part at position ${i + 1}`);
  });
  return clean.join("_");
}

export interface CampaignNameInput {
  client: string;
  market: string;
  platform: string;
  stage: Stage;
  objective: string;
  /** YYYYMM */
  month: string;
}

/** {client}_{market}_{platform}_{stage}_{objective}_{yyyymm} */
export function campaignName(c: CampaignNameInput): string {
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(c.month)) throw new Error("month must be YYYYMM");
  if (!STAGES.includes(c.stage)) throw new Error(`Unknown stage ${c.stage}`);
  return join([c.client, c.market, c.platform, c.stage, c.objective, c.month]);
}

/** {audience}_{placement}_{optimization}_{test-id|AO}. AO means always on. */
export const adSetName = (audience: string, placement: string, optimization: string, testId?: string) =>
  join([audience, placement, optimization, testId ?? "ao"]);

/** {test-id}-{variant}_{format}_{angle}_{hook}_{lang} */
export const adName = (testId: string, variant: string, format: string, angle: string, hook: string, lang: string) =>
  join([`${testId}-${variant}`, format, angle, hook, lang]);

const CAMPAIGN = /^[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_(prospect|retarget|retain)_[a-z0-9-]+_\d{6}$/;

export const isCampaignName = (name: string) => CAMPAIGN.test(name);
