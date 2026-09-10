"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Square, X, BarChart2, AlertCircle } from "lucide-react";
import { useMapStore } from "@/lib/store";
import { apiFetch, SpatialQueryResult } from "@/lib/api";

export default function DrawTool() {
  const { drawActive, setDrawActive, setDrawResult, drawResult } = useMapStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateDraw = () => {
    setDrawActive(true);
    setDrawResult(null);
    setError(null);
    // The actual draw interaction is handled by a global event listener
    // injected into the MapView via window events
    window.dispatchEvent(new CustomEvent("bhoomi:draw-start"));
  };

  const clearDraw = () => {
    setDrawActive(false);
    setDrawResult(null);
    window.dispatchEvent(new CustomEvent("bhoomi:draw-clear"));
  };

  useEffect(() => {
    const handleDrawComplete = async (e: Event) => {
      const { polygon } = (e as CustomEvent).detail;
      setLoading(true);
      try {
        const result = await apiFetch<SpatialQueryResult>("/api/parcels/spatial-query", {
          method: "POST",
          body: JSON.stringify({ geojson_polygon: polygon }),
        });
        setDrawResult(result);
      } catch {
        setError("Spatial query failed.");
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener("bhoomi:draw-complete", handleDrawComplete);
    return () => window.removeEventListener("bhoomi:draw-complete", handleDrawComplete);
  }, [setDrawResult]);

  return (
    <div style={{ position: "absolute", bottom: 24, right: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      {/* Result card */}
      {drawResult && (
        <div className="fade-in" style={{
          background: "var(--bg-card)", border: "1px solid var(--border-accent)",
          borderRadius: 12, padding: 14, width: 240,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
              <BarChart2 size={12} style={{ display: "inline", marginRight: 4 }} />
              Area Selection
            </div>
            <button onClick={clearDraw} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X size={13} />
            </button>
          </div>
          {[
            { label: "Parcels Selected",  value: drawResult.parcel_count },
            { label: "Total Area",        value: `${(drawResult.total_area_sqm / 10000).toFixed(2)} Ha` },
            { label: "Pending Tax",       value: `₹${(drawResult.total_pending_tax / 1000).toFixed(1)}K`, alert: drawResult.total_pending_tax > 0 },
            { label: "Tax Defaulters",    value: drawResult.defaulter_count, alert: drawResult.defaulter_count > 0 },
          ].map(({ label, value, alert }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: (alert) ? "var(--red)" : "var(--text-primary)" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--red)", display: "flex", gap: 6, alignItems: "center" }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Tool button */}
      <button
        onClick={drawActive ? clearDraw : activateDraw}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: drawActive ? "var(--accent-dim)" : "var(--bg-card)",
          border: `1px solid ${drawActive ? "var(--border-accent)" : "var(--border)"}`,
          borderRadius: 10, padding: "10px 14px", cursor: "pointer",
          color: drawActive ? "var(--accent)" : "var(--text-secondary)",
          fontSize: 12, fontWeight: 600, transition: "all 0.2s",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        {drawActive ? <Square size={14} /> : <Pencil size={14} />}
        {drawActive ? (loading ? "Querying…" : "Draw Polygon") : "Spatial Query"}
      </button>
    </div>
  );
}
