"use client";

import { Clock } from "lucide-react";
import { useMapStore } from "@/lib/store";
import useSWR from "swr";
import { fetcher } from "@/lib/api";

interface OwnerRecord {
  owner_name: string;
  ownership_type: string;
  valid_from: string;
  valid_to: string | null;
  deed_number: string | null;
}

export default function TimeSlider() {
  const { activeULPIN, historyYear, setHistoryYear } = useMapStore();

  const { data } = useSWR<{ current_owner: OwnerRecord | null; history: OwnerRecord[] }>(
    activeULPIN ? `/api/parcels/${activeULPIN}/ownership` : null,
    fetcher
  );

  if (!activeULPIN || !data) return null;

  const allOwners = [
    ...(data.history || []),
    ...(data.current_owner ? [data.current_owner] : []),
  ].sort((a, b) => new Date(a.valid_from).getFullYear() - new Date(b.valid_from).getFullYear());

  const minYear = allOwners.length ? new Date(allOwners[0].valid_from).getFullYear() : 1980;
  const maxYear = new Date().getFullYear();

  const ownerAtYear = allOwners.findLast(
    (o) => new Date(o.valid_from).getFullYear() <= historyYear
  );

  return (
    <div style={{
      position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "12px 20px", zIndex: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 380,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Clock size={13} color="var(--accent)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Ownership Timeline
        </span>
        <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>
          {historyYear}
        </span>
      </div>

      <input
        type="range"
        min={minYear}
        max={maxYear}
        value={historyYear}
        onChange={(e) => setHistoryYear(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
        <span>{minYear}</span><span>{maxYear}</span>
      </div>

      {ownerAtYear && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: "var(--accent-dim)", border: "1px solid var(--border-accent)",
          borderRadius: 8, display: "flex", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {ownerAtYear.owner_name}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {ownerAtYear.ownership_type} · Since {new Date(ownerAtYear.valid_from).getFullYear()}
              {ownerAtYear.valid_to ? ` → ${new Date(ownerAtYear.valid_to).getFullYear()}` : " (Current)"}
            </div>
          </div>
          {ownerAtYear.deed_number && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center" }}>
              Deed: {ownerAtYear.deed_number}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
