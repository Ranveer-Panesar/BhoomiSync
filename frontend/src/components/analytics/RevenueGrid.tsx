"use client";

import useSWR from "swr";
import { fetcher, RevenueResponse, RevenueMetric } from "@/lib/api";
import { ExternalLink } from "lucide-react";
import { useMapStore } from "@/lib/store";

function Skeleton({ height = 14, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 4 }} />;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Property Tax":       "#00C896",
  "Water Charges":      "#3B82F6",
  "Electricity":        "#F59E0B",
  "Sewer/SWM":         "#8B5CF6",
  "Garbage Collection": "#EF4444",
};

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function MetricRow({ metric, onViewDefaulters }: { metric: RevenueMetric; onViewDefaulters: () => void }) {
  const color = CATEGORY_COLORS[metric.category] ?? "#4A5568";
  const pct = Math.min(100, metric.collection_pct);

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "16px 20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{metric.category}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {metric.defaulter_count} defaulter(s)
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color }}>{metric.collection_pct}%</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Collection Rate</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: 10 }}>
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Due</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(metric.total_due)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Collected</div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(metric.total_collected)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>
              {fmt(metric.total_due - metric.total_collected)}
            </div>
          </div>
        </div>

        {metric.defaulter_count > 0 && (
          <button
            onClick={onViewDefaulters}
            style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
              color: "var(--red)", background: "var(--red-dim)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "5px 10px",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            View Defaulters <ExternalLink size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function RevenueGrid() {
  const { data, isLoading } = useSWR<RevenueResponse>("/api/analytics/revenue", fetcher);
  const { activeLayers, toggleLayer } = useMapStore();

  const viewDefaulters = () => {
    if (!activeLayers.taxDefaulters) toggleLayer("taxDefaulters");
    window.location.href = "/";  // Navigate to map view
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary banner */}
      {!isLoading && data && (
        <div style={{
          background: "linear-gradient(135deg, rgba(0,200,150,0.1) 0%, rgba(37,99,235,0.1) 100%)",
          border: "1px solid var(--border-accent)", borderRadius: 12, padding: "16px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>FY {data.financial_year} · Overall Collection Rate</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", lineHeight: 1.1 }}>
              {data.overall_pct}%
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Total Pending</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--red)" }}>
              {fmt(data.total_due - data.total_collected)}
            </div>
          </div>
        </div>
      )}

      {/* Metric grid */}
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card" style={{ height: 120 }}><Skeleton height={120} /></div>
        ))
      ) : (
        data?.metrics.map((m) => (
          <MetricRow key={m.category} metric={m} onViewDefaulters={viewDefaulters} />
        ))
      )}
    </div>
  );
}
