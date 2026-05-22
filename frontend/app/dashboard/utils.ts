import type { Database } from "@/lib/supabase/types";

export type Marketplace = {
  id: string;
  platform: string;
  storeName: string;
  region: string;
  syncCadence: string;
  status: "Connected" | "Syncing" | "Attention";
};

export type AlertRow = {
  platform: string;
  product: string;
  signature: string;
  risk: number;
  node: string;
};

export type MarketplaceRow = Database["public"]["Tables"]["marketplaces"]["Row"];
export type AlertRowData = Database["public"]["Tables"]["alerts"]["Row"];

export const formatCadence = (value?: string | null) => {
  if (!value) return "Real-time";
  if (value === "real_time") return "Real-time";
  if (value === "real-time") return "Real-time";
  if (value === "5_min") return "5 min";
  if (value === "15_min") return "15 min";
  if (value === "hourly") return "Hourly";
  return value;
};

export const toDbCadence = (value: string) => {
  if (value.toLowerCase() === "real-time") return "real_time";
  if (value.toLowerCase() === "5 min") return "5_min";
  if (value.toLowerCase() === "15 min") return "15_min";
  if (value.toLowerCase() === "hourly") return "hourly";
  return value.toLowerCase().replace(" ", "_");
};

export const mapMarketplaceStatus = (value?: string | null): Marketplace["status"] => {
  if (value === "syncing") return "Syncing";
  if (value === "attention") return "Attention";
  return "Connected";
};

export const mapMarketplaceRow = (row: MarketplaceRow): Marketplace => ({
  id: row.id,
  platform: row.platform,
  storeName: row.store_name,
  region: row.region ?? "US",
  syncCadence: formatCadence(row.sync_cadence),
  status: mapMarketplaceStatus(row.status),
});
