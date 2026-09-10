"use client";

import CityOverview from "@/components/analytics/CityOverview";
import RevenueGrid from "@/components/analytics/RevenueGrid";
import { useState } from "react";
import { BarChart3, IndianRupee } from "lucide-react";

const tabs = [
  { id: "city",    label: "City Overview",            icon: BarChart3 },
  { id: "revenue", label: "Revenue & Collection",     icon: IndianRupee },
];

export default function AnalyticsPage() {
  const [active, setActive] = useState("city");

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg-primary)", padding: "20px 24px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          Data Analytics
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          City-wide aggregated land record and revenue metrics — Bengaluru Urban District
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
              borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: active === id ? "var(--accent-dim)" : "var(--bg-card)",
              border: `1px solid ${active === id ? "var(--border-accent)" : "var(--border)"}`,
              color: active === id ? "var(--accent)" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "city"    && <CityOverview />}
      {active === "revenue" && <RevenueGrid />}
    </div>
  );
}
