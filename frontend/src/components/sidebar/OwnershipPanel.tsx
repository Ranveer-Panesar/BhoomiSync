"use client";

import useSWR from "swr";
import { fetcher, OwnershipResponse } from "@/lib/api";
import { Users, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";

function Skeleton({ height = 12, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 4 }} />;
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={12} color="var(--accent)" />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)", fontFamily: mono ? "JetBrains Mono, monospace" : undefined }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function OwnershipPanel({ ulpin }: { ulpin: string }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data, isLoading } = useSWR<OwnershipResponse>(`/api/parcels/${ulpin}/ownership`, fetcher);

  return (
    <SectionCard title="Land Ownership (RoR)" icon={Users}>
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[80, 60, 70, 50].map((w, i) => <Skeleton key={i} width={`${w}%`} />)}
        </div>
      ) : data?.current_owner ? (
        <>
          <div style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              {data.current_owner.owner_name}
            </div>
            <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 2 }}>Current Owner</div>
          </div>
          <Row label="Ownership Type"  value={data.current_owner.ownership_type} />
          <Row label="Survey Number"   value={data.current_owner.survey_number} />
          <Row label="Phone"           value={data.current_owner.contact_phone} />
          <Row label="Since"           value={data.current_owner.valid_from} />
          <Row label="Deed No."        value={data.current_owner.deed_number} mono />

          {data.history.length > 0 && (
            <>
              <button
                onClick={() => setHistoryOpen((o) => !o)}
                style={{
                  width: "100%", marginTop: 8, padding: "7px 10px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                  borderRadius: 7, cursor: "pointer", fontSize: 11, color: "var(--text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <FileText size={10} /> Previous Deeds ({data.history.length})
                </span>
                {historyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {historyOpen && (
                <div className="fade-in" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.history.map((h) => (
                    <div key={h.id} style={{
                      padding: "8px 10px", background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)", borderRadius: 7,
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>{h.owner_name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        {h.valid_from} → {h.valid_to} · {h.ownership_type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No ownership record found.</div>
      )}
    </SectionCard>
  );
}
