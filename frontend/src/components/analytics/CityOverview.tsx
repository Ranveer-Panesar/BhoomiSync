"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { CityOverview as CityOverviewData } from "@/lib/api";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";
import { Map, LayoutGrid, Hash, Globe } from "lucide-react";

function Skeleton({ height = 14, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 4 }} />;
}

const LAND_USE_COLORS: Record<string, string> = {
  Residential: "#2563EB", Commercial: "#F59E0B",
  Industrial: "#EF4444", Agricultural: "#10B981", Mixed: "#8B5CF6",
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

const SERVICE_BUILDINGS = [
  { name: "BBMP Primary School – Ward 14",  type: "Education",  status: "Operational" },
  { name: "Rajajinagar District Hospital",   type: "Healthcare", status: "Operational" },
  { name: "Koramangala Fire Station",        type: "Emergency",  status: "Operational" },
  { name: "BTM Police Station",              type: "Law",        status: "Operational" },
  { name: "Malleswaram Govt. Library",       type: "Library",    status: "Under Renovation" },
  { name: "Jayanagar Community Hall",        type: "Civic",      status: "Operational" },
];

export default function CityOverview() {
  const { data, isLoading } = useSWR<CityOverviewData>("/api/analytics/city-overview", fetcher);

  const pieData = data
    ? Object.entries(data.land_use_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const barData = data?.ward_distribution.slice(0, 8).map((w) => ({
    ward: w.ward.slice(0, 8),
    count: w.count,
  })) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 88 }}><Skeleton height={88} /></div>
          ))
        ) : (
          <>
            <StatCard icon={Hash}       label="Registered ULPINs"  value={data?.total_ulpins ?? 0}                      color="#00C896" />
            <StatCard icon={Map}        label="Total Area (km²)"   value={data?.total_area_sqkm.toFixed(2) ?? 0}        color="#2563EB" />
            <StatCard icon={LayoutGrid} label="Municipal Wards"     value={data?.total_wards ?? 0}                        color="#F59E0B" />
            <StatCard icon={Globe}      label="District"            value="Bengaluru Urban"                               color="#8B5CF6" />
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Land Use Breakdown */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>Land Use Distribution</div>
          {isLoading ? <Skeleton height={180} /> : (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={LAND_USE_COLORS[entry.name] ?? "#4A5568"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: LAND_USE_COLORS[d.name] ?? "#4A5568" }} />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ward Distribution */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>Parcels per Ward</div>
          {isLoading ? <Skeleton height={180} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="ward" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" fill="#00C896" opacity={0.8} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Service Buildings */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>
          Civic Service Buildings
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SERVICE_BUILDINGS.map((b) => (
            <div key={b.name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)", borderRadius: 8,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{b.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{b.type}</div>
              </div>
              <span className={`badge ${b.status === "Operational" ? "badge-green" : "badge-amber"}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
