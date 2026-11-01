// Test data. Every client name ends in "(test)" so nobody mistakes it for a real account.
// Replace with GET /clients from the engine when real clients exist.
import { catalog, marketGroupOf } from "./catalog.js";
import type { Client, ServiceCode, User } from "./types.js";

const PITH_ROLES = catalog.roles.filter((r) => !r.startsWith("client_") && r !== "external_contact" && r !== "subject_expert" && r !== "native_editor");
const CLIENT_ROLES = catalog.roles.filter((r) => r.startsWith("client_"));

export function seedUsers(): User[] {
  return [
    { id: "u-boss", name: "Boss", roles: PITH_ROLES, note: "Pith admin. Holds every Pith role." },
    { id: "u-client", name: "Sam Reed (test client)", roles: [...CLIENT_ROLES, "subject_expert", "native_editor"], note: "Test client user with every client role, plus subject expert and native editor." },
    { id: "u-analyst", name: "Priya Shah (test analyst)", roles: ["analytics_lead"], note: "Test Pith analyst. Can only decide report gates." },
  ];
}

interface ClientSeed {
  name: string;
  model: "B2B" | "B2C";
  industry: string;
  markets: string[];
  services: ServiceCode[];
  account_lead: string;
  currency: string;
}

const CLIENTS: ClientSeed[] = [
  {
    name: "Northwind Analytics (test)", model: "B2B", industry: "B2B SaaS", markets: ["GB", "NL", "DE"],
    services: ["email", "content", "abm", "crm_ops", "search", "paid_social", "analytics", "events", "cro", "pr"],
    account_lead: "Alex Morgan", currency: "GBP",
  },
  {
    name: "Lumen Skincare (test)", model: "B2C", industry: "Beauty and skincare", markets: ["SG", "GB"],
    services: ["social", "influencer", "paid_social", "email", "messaging", "community", "video", "brand", "affiliate"],
    account_lead: "Jia Tan", currency: "SGD",
  },
  {
    name: "Atlas Freight (test)", model: "B2B", industry: "Logistics", markets: ["US", "CA"],
    services: ["abm", "search", "content", "crm_ops", "video", "events", "campaigns", "analytics"],
    account_lead: "Jordan Lee", currency: "USD",
  },
  {
    name: "Dune Hospitality (test)", model: "B2C", industry: "Hotels and resorts", markets: ["AE", "SA"],
    services: ["campaigns", "social", "messaging", "paid_social", "influencer", "pr", "cro", "brand", "search"],
    account_lead: "Omar Haddad", currency: "AED",
  },
];

export function seedClients(uuid: () => string): Client[] {
  return CLIENTS.map((c) => ({
    id: uuid(),
    ...c,
    market_groups: [...new Set(c.markets.map((m) => marketGroupOf(m)!).filter(Boolean))],
    paused: false,
    paused_reason: null,
    test_data: true as const,
  }));
}
