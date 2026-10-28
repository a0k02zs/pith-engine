/** GSM 03.38 basic character set. Each one costs 1 unit. */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
/** GSM 03.38 extension table. Each one costs 2 units (escape + character). */
const GSM_EXTENDED = "^{}\\[~]|€\f";

export type Encoding = "GSM-7" | "UCS-2";

export interface SegmentInfo {
  encoding: Encoding;
  /** Septets for GSM-7, UTF-16 code units for UCS-2. */
  units: number;
  segments: number;
  /** Characters that force UCS-2, in order of first use. */
  unicode_chars: string[];
}

export const LIMITS = {
  "GSM-7": { single: 160, multi: 153 },
  "UCS-2": { single: 70, multi: 67 },
} as const;

/** Pith rule: a marketing SMS must not be longer than 2 segments. */
export const MAX_SEGMENTS = 2;

export function segmentInfo(text: string): SegmentInfo {
  const unicode: string[] = [];
  let septets = 0;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXTENDED.includes(ch)) septets += 2;
    else if (!unicode.includes(ch)) unicode.push(ch);
  }
  const encoding: Encoding = unicode.length ? "UCS-2" : "GSM-7";
  const units = encoding === "GSM-7" ? septets : text.length;
  const { single, multi } = LIMITS[encoding];
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { encoding, units, segments, unicode_chars: unicode };
}
