"use client";

import useSWR from "swr";
import { fetcher, FiscalResponse } from "@/lib/api";
import { IndianRupee, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";

function Skeleton({ height = 12, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 4 }} />;
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={12} color="#F59E0B" />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const STATUS_COLOR: Record<string, string> = {
  Paid:     "badge-green",
  Defaulter:"badge-red",
  Partial:  "badge-amber",
  Exempt:   "badge-muted",
};

export default function FiscalPanel({ ulpin }: { ulpin: string }) {
  const { data, isLoading } = useSWR<FiscalResponse>(`/api/parcels/${ulpin}/fiscal`, fetcher);

  const chartData = data?.records.map((r) => ({
    fy: r.financial_year.slice(-2),  // '24-25' → '25'
    paid: Number(r.amount_paid),
    due: Number(r.amount_due),
  })).reverse() ?? [];

  return (
    <SectionCard title="Fiscal Status (Property Tax)" icon={IndianRupee}>
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[90, 60, 70].map((w, i) => <Skeleton key={i} width={`${w}%`} />)}
          <Skeleton height={60} />
        </div>
      ) : data ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Status FY 24-25</div>
              <span className={`badge ${STATUS_COLOR[data.current_status] ?? "badge-muted"}`}>
                {data.current_status}
              </span>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Current Due</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: data.current_fy_due > 0 ? "var(--red)" : "var(--green)" }}>
                {fmt(data.current_fy_due)}
              </div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Total Arrears</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: data.total_arrears > 0 ? "var(--amber)" : "var(--green)" }}>
                {fmt(data.total_arrears)}
              </div>
            </div>
          </div>

          {/* 5-year sparkline */}
          {chartData.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>5-Year Payment History</div>
              <ResponsiveContainer width="100%" height={70}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fy" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v, name) => [fmt(Number(v)), name === "paid" ? "Paid" : "Due"]}
                  />
                  <Area type="monotone" dataKey="paid" stroke="#10B981" fill="url(#paidGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No fiscal data available.</div>
      )}
    </SectionCard>
  );
}
