/**
 * BhoomiSync API Client
 * All API calls go through this module, targeting NEXT_PUBLIC_API_URL.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ─── SWR fetcher ──────────────────────────────────────────────────────────────
export const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json();
  });

// ─── Search ───────────────────────────────────────────────────────────────────
export interface SearchResult {
  ulpin: string;
  plot_number: string;
  address: string | null;
  owner_name: string | null;
  similarity: number;
}

export async function searchParcels(q: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
}

// ─── Parcel types ─────────────────────────────────────────────────────────────
export interface ParcelDetail {
  id: string;
  ulpin: string;
  plot_number: string;
  area_sqm: number;
  land_use: string;
  ward_name: string | null;
  district: string | null;
  state: string | null;
  address: string | null;
  has_conflict: boolean;
}

export interface OwnerRecord {
  id: string;
  owner_name: string;
  ownership_type: string;
  contact_phone: string | null;
  survey_number: string | null;
  valid_from: string;
  valid_to: string | null;
  deed_number: string | null;
}

export interface OwnershipResponse {
  current_owner: OwnerRecord | null;
  history: OwnerRecord[];
}

export interface TaxRecord {
  id: string;
  financial_year: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  payment_date: string | null;
  arrears: number;
  penalty: number;
}

export interface FiscalResponse {
  current_status: string;
  current_fy_due: number;
  total_arrears: number;
  records: TaxRecord[];
}

export interface UtilityRecord {
  id: string;
  utility_type: string;
  connection_status: string;
  provider: string | null;
  connection_id: string | null;
  avg_consumption: number | null;
  consumption_unit: string | null;
  meter_status: string | null;
  recent_bill_amount: number | null;
  last_reading_date: string | null;
}

export interface UtilitiesResponse {
  electricity: UtilityRecord | null;
  water: UtilityRecord | null;
}

export interface InfraRecord {
  sewage_connected: boolean;
  nearest_manhole_id: string | null;
  building_plan_approved: boolean;
  approved_floors: string | null;
  construction_year: number | null;
  active_violations: number;
  violations_detail: Array<{ type: string; date: string }>;
}

export interface ConflictAlert {
  id: string;
  parcel_id: string;
  ulpin: string | null;
  plot_number: string | null;
  alert_type: string;
  severity: string;
  description: string;
  detected_at: string;
  resolved: boolean;
}

// ─── Analytics types ──────────────────────────────────────────────────────────
export interface CityOverview {
  total_parcels: number;
  total_area_sqkm: number;
  total_wards: number;
  total_ulpins: number;
  land_use_breakdown: Record<string, number>;
  ward_distribution: Array<{ ward: string; count: number }>;
}

export interface RevenueMetric {
  category: string;
  total_due: number;
  total_collected: number;
  collection_pct: number;
  defaulter_count: number;
}

export interface RevenueResponse {
  financial_year: string;
  metrics: RevenueMetric[];
  total_due: number;
  total_collected: number;
  overall_pct: number;
}

// ─── Spatial query ────────────────────────────────────────────────────────────
export interface SpatialQueryResult {
  parcel_count: number;
  total_area_sqm: number;
  total_pending_tax: number;
  defaulter_count: number;
  parcels: ParcelDetail[];
}
