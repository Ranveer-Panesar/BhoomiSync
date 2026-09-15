"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { fetcher, CityOverview, PublicFacility, RevenueResponse } from "@/lib/api";
import { MapPin, Users, BarChart3, Building2, GraduationCap, Heart, TrendingUp, Layers, AlertTriangle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
      padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14, flex: 1,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function FacilityRow({ f }: { f: PublicFacility }) {
  const isHospital = f.facility_type === "Hospital";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 0", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: isHospital ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isHospital ? <Heart size={13} color="#EF4444" /> : <GraduationCap size={13} color="#10B981" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.locality} · {f.capacity}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "2px 7px",
        background: f.status === "Operational" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
        color: f.status === "Operational" ? "#059669" : "#D97706",
      }}>{f.status}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview } = useSWR<CityOverview>("/api/analytics/city-overview", fetcher);
  const { data: revenue } = useSWR<RevenueResponse>("/api/analytics/revenue", fetcher);
  const { data: facilities } = useSWR<PublicFacility[]>("/api/analytics/facilities", fetcher);
  const [facilityTab, setFacilityTab] = useState<"School" | "Hospital">("School");

  const filteredFacilities = (facilities || []).filter(f => f.facility_type === facilityTab);

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg-primary)", padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.02em" }}>
          Mohali Municipal Area Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Unified land record & municipal administration overview — SUTRA Platform
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Registered ULPINs"  value={overview?.total_ulpins  ?? "—"} icon={Building2}  color="#0284C7" sub="Unique land parcels" />
        <StatCard label="Total Area (sq km)"  value={overview?.total_area_sqkm?.toFixed(2) ?? "—"} icon={MapPin} color="#7C3AED" sub="Municipal coverage" />
        <StatCard label="Total Wards"         value={overview?.total_wards   ?? "—"} icon={Layers}   color="#059669" sub="Administrative wards" />
        <StatCard label="Tax Collection Rate" value={revenue ? `${revenue.overall_pct}%` : "—"} icon={TrendingUp} color="#D97706" sub={`FY ${revenue?.financial_year ?? "2024-25"}`} />
      </div>

      {/* Two-column: map + right panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, minHeight: 480 }}>
        {/* GIS Map panel */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 5,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "5px 12px",
            fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
          }}>
            📍 GIS Parcel Map — Mohali
          </div>
          <MapView />
          <Link href="/map" style={{
            position: "absolute", bottom: 12, right: 12, zIndex: 5,
            background: "var(--accent)", color: "#fff",
            borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
          }}>
            Open Full Map →
          </Link>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Service Buildings panel */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
            padding: "16px", flex: 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Service Buildings</span>
              <div style={{ display: "flex", gap: 4 }}>
                {(["School", "Hospital"] as const).map(t => (
                  <button key={t} onClick={() => setFacilityTab(t)} style={{
                    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                    background: facilityTab === t ? "var(--accent-dim)" : "var(--bg-card-hover)",
                    border: `1px solid ${facilityTab === t ? "var(--border-accent)" : "var(--border)"}`,
                    color: facilityTab === t ? "var(--accent)" : "var(--text-secondary)",
                  }}>{t}s</button>
                ))}
              </div>
            </div>
            <div>
              {filteredFacilities.length === 0
                ? <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0" }}>Loading…</div>
                : filteredFacilities.map(f => <FacilityRow key={f.id} f={f} />)
              }
            </div>
          </div>

          {/* Revenue teaser */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
            padding: "16px",
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 10 }}>Revenue Snapshot</div>
            {revenue?.metrics.slice(0, 3).map(m => (
              <div key={m.category} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{m.category}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.collection_pct >= 75 ? "#059669" : "#D97706" }}>
                    {m.collection_pct}%
                  </span>
                </div>
                <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${m.collection_pct}%`,
                    background: m.collection_pct >= 75 ? "var(--green)" : "var(--amber)",
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            ))}
            <Link href="/analytics" style={{
              display: "block", textAlign: "center", marginTop: 10,
              fontSize: 12, fontWeight: 600, color: "var(--accent)",
              textDecoration: "none",
            }}>
              View Revenue & Dues →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
