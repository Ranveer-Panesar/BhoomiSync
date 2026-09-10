"use client";

import { useMapStore } from "@/lib/store";
import { Droplets, Zap, AlertTriangle, Map, Eye, EyeOff } from "lucide-react";

const layers = [
  { key: "waterLines" as const,         icon: Droplets,      label: "Water Lines",        color: "#3B82F6" },
  { key: "powerGrid" as const,          icon: Zap,           label: "Power Grid",         color: "#F59E0B" },
  { key: "taxDefaulters" as const,      icon: AlertTriangle, label: "Tax Defaulters",     color: "#EF4444" },
  { key: "zoningRestrictions" as const, icon: Map,           label: "Zoning Restrictions", color: "#8B5CF6" },
];

export default function LayerControl() {
  const { activeLayers, toggleLayer } = useMapStore();

  return (
    <div style={{
      position: "absolute", bottom: 24, left: 16, zIndex: 10,
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 200,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        Map Layers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {layers.map(({ key, icon: Icon, label, color }) => {
          const active = activeLayers[key];
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: active ? `${color}15` : "transparent",
                border: `1px solid ${active ? `${color}40` : "var(--border)"}`,
                borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                transition: "all 0.15s", width: "100%", textAlign: "left",
                color: active ? color : "var(--text-secondary)",
              }}
            >
              <Icon size={13} />
              <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{label}</span>
              {active ? <Eye size={11} /> : <EyeOff size={11} style={{ opacity: 0.4 }} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Zoning Legend
        </div>
        {[
          { label: "Residential",  color: "#2563EB" },
          { label: "Commercial",   color: "#F59E0B" },
          { label: "Industrial",   color: "#EF4444" },
          { label: "Agricultural", color: "#10B981" },
          { label: "Mixed",        color: "#8B5CF6" },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.8 }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
