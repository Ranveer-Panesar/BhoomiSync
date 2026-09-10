"use client";

import useSWR from "swr";
import { fetcher, InfraRecord } from "@/lib/api";
import { Building2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

function Skeleton({ height = 12, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 4 }} />;
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={12} color="#A78BFA" />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function BoolRow({ label, value, trueLabel = "Yes", falseLabel = "No" }: {
  label: string; value: boolean; trueLabel?: string; falseLabel?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: value ? "var(--green)" : "var(--red)" }}>
        {value ? <CheckCircle size={11} /> : <XCircle size={11} />}
        {value ? trueLabel : falseLabel}
      </span>
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function InfraPanel({ ulpin }: { ulpin: string }) {
  const { data, isLoading } = useSWR<InfraRecord>(`/api/parcels/${ulpin}/infrastructure`, fetcher);

  return (
    <SectionCard title="Physical Assets & Infrastructure" icon={Building2}>
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[100, 80, 70, 60, 90].map((w, i) => <Skeleton key={i} width={`${w}%`} />)}
        </div>
      ) : data ? (
        <>
          <BoolRow label="Sewage Connected"    value={data.sewage_connected} />
          <BoolRow label="Building Plan"       value={data.building_plan_approved} trueLabel="Approved" falseLabel="Not Approved" />
          <TextRow label="Approved Floors"     value={data.approved_floors} />
          <TextRow label="Construction Year"   value={data.construction_year} />
          <TextRow label="Nearest Manhole ID"  value={data.nearest_manhole_id} />

          {/* Violations */}
          <div style={{
            marginTop: 4, padding: "10px 12px",
            background: data.active_violations > 0 ? "var(--red-dim)" : "var(--green-dim)",
            border: `1px solid ${data.active_violations > 0 ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {data.active_violations > 0
                ? <AlertTriangle size={12} color="var(--red)" />
                : <CheckCircle size={12} color="var(--green)" />}
              <span style={{ fontSize: 12, fontWeight: 700, color: data.active_violations > 0 ? "var(--red)" : "var(--green)" }}>
                {data.active_violations > 0 ? `${data.active_violations} Active Violation(s)` : "No Violations"}
              </span>
            </div>
            {data.violations_detail.map((v, i) => (
              <div key={i} style={{ fontSize: 10, color: "var(--text-secondary)", paddingLeft: 18, marginTop: 3 }}>
                • {v.type} ({v.date})
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No infrastructure record.</div>
      )}
    </SectionCard>
  );
}
