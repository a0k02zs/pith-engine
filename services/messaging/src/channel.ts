import { resolveMarket, type Channel } from "./market-rules.js";
import type { Purpose } from "./window.js";

export interface ContactChannels {
  country: string;
  /** Consent status per channel, as in the engine consent record ("granted" means it can be used). */
  consents: Partial<Record<Channel | "email", string>>;
  push_tokens?: { platform: string; token: string; enabled?: boolean }[];
  whatsapp_window_open_until?: string | Date;
  has_phone?: boolean;
}

export interface MessageNeed {
  purpose: Purpose;
  /** Security codes and delivery failures: skip push and use a phone channel at once. */
  critical?: boolean;
}

export interface ChannelChoice {
  channel: Channel | "email" | "none";
  /** WhatsApp only: free-form text is allowed only inside the 24 h customer service window. */
  whatsapp_mode?: "template" | "free_form";
  /** Utility WhatsApp only: send SMS if WhatsApp is not delivered in this many minutes. */
  sms_fallback_after_minutes?: number;
  reason: string;
}

/** Markets where WhatsApp comes before SMS (playbook section 2): GCC, Singapore, UK and the EU. */
export const WHATSAPP_FIRST_MARKETS = ["GB", "SG", "AE", "SA", "QA", "KW", "BH", "OM", "EU"];

export const SMS_FALLBACK_MINUTES = 10;

const granted = (c: ContactChannels, ch: Channel | "email") => c.consents[ch] === "granted";

/** The channel waterfall: push, then WhatsApp, then SMS, then email (service 1). */
export function chooseChannel(contact: ContactChannels, need: MessageNeed, now: Date = new Date()): ChannelChoice {
  const market = resolveMarket(contact.country).market;
  const hasPush = (contact.push_tokens ?? []).some((t) => t.enabled !== false);

  if (!need.critical && hasPush && granted(contact, "push")) return { channel: "push", reason: "app installed and push on" };

  const phone = contact.has_phone !== false;
  if (phone && WHATSAPP_FIRST_MARKETS.includes(market) && granted(contact, "whatsapp")) {
    const open = contact.whatsapp_window_open_until ? new Date(contact.whatsapp_window_open_until).getTime() > now.getTime() : false;
    const choice: ChannelChoice = {
      channel: "whatsapp",
      whatsapp_mode: open ? "free_form" : "template",
      reason: `WhatsApp consent in a WhatsApp-first market (${market})`,
    };
    if (need.purpose === "utility" && granted(contact, "sms")) choice.sms_fallback_after_minutes = SMS_FALLBACK_MINUTES;
    return choice;
  }
  if (phone && granted(contact, "sms")) return { channel: "sms", reason: "SMS consent" };
  if (granted(contact, "email")) return { channel: "email", reason: "no usable phone or push channel; hand to the email service" };
  return { channel: "none", reason: "no channel with consent" };
}
