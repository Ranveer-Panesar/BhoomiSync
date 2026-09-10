"use client";

import useSWR from "swr";
import { fetcher, UtilitiesResponse } from "@/lib/api";
import { Zap, Droplets, CheckCircle, XCircle, AlertCircle } from "lucide-react";

function Skeleton({ height = 12, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 4 }} />;
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent-blue-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={12} color="#60A5FA" />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Active") return <CheckCircle size={12} color="var(--green)" />;
  if (status === "Inactive") return <XCircle size={12} color="var(--red)" />;
  return <AlertCircle size={12} color="var(--amber)" />;
}

function UtilityCard({
  icon: Icon, title, color, data,
}: {
  icon: React.ElementType; title: string; color: string;
  data: UtilitiesResponse["electricity"];
}) {
  if (!data) {
    return (
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", opacity: 0.5 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 5, alignItems: "center" }}>
          <Icon size={11} /> {title} — No connection
        </div>
      </div>
    );
  }

  const STATUS_COLOR: Record<string, string> = {
    Active: "var(--green)", Inactive: "var(--red)", Disconnected: "var(--amber)",
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color }}>
          <Icon size={13} /> {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <StatusIcon status={data.connection_status} />
          <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[data.connection_status] }}>
            {data.connection_status}
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
        {[
          ["Provider",     data.provider],
          ["Conn. ID",     data.connection_id],
          ["Avg. Usage",   data.avg_consumption ? `${data.avg_consumption} ${data.consumption_unit}` : null],
          ["Meter",        data.meter_status],
          ["Last Bill",    data.recent_bill_amount ? `₹${data.recent_bill_amount.toFixed(0)}` : null],
          ["Last Reading", data.last_reading_date],
        ].map(([label, value]) => (
          <div key={label as string}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}>{value || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UtilitiesPanel({ ulpin }: { ulpin: string }) {
  const { data, isLoading } = useSWR<UtilitiesResponse>(`/api/parcels/${ulpin}/utilities`, fetcher);

  return (
    <SectionCard title="Utilities (Electricity & Water)" icon={Zap}>
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <UtilityCard icon={Zap}     title="Electricity" color="#F59E0B" data={data.electricity} />
          <UtilityCard icon={Droplets} title="Water"       color="#3B82F6" data={data.water} />
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No utility data.</div>
      )}
    </SectionCard>
  );
}
