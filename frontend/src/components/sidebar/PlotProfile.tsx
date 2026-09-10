"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { useMapStore } from "@/lib/store";
import { ParcelDetail } from "@/lib/api";
import {
  X, FileText, Printer, Shield, AlertTriangle,
  MapPin, Maximize2, Hash,
} from "lucide-react";
import OwnershipPanel from "./OwnershipPanel";
import FiscalPanel from "./FiscalPanel";
import UtilitiesPanel from "./UtilitiesPanel";
import InfraPanel from "./InfraPanel";

function Skeleton({ width = "100%", height = 14, style = {} }: { width?: string | number; height?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

function ActionButton({ icon: Icon, label, danger }: { icon: React.ElementType; label: string; danger?: boolean }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", gap: 5, flex: 1,
      padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600,
      background: danger ? "var(--red-dim)" : "var(--accent-blue-dim)",
      border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "rgba(37,99,235,0.3)"}`,
      color: danger ? "var(--red)" : "#60A5FA", transition: "all 0.15s",
    }}>
      <Icon size={11} /> {label}
    </button>
  );
}

export default function PlotProfile() {
  const { activeULPIN, setSidebarOpen, sidebarOpen } = useMapStore();

  const { data: parcel, isLoading } = useSWR<ParcelDetail>(
    activeULPIN ? `/api/parcels/${activeULPIN}` : null,
    fetcher
  );

  if (!sidebarOpen || !activeULPIN) return null;

  return (
    <aside
      className="slide-in"
      style={{
        width: 380, minWidth: 380, maxWidth: 380,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflowY: "auto", overflowX: "hidden",
        zIndex: 15,
      }}
    >
      {/* Header */}
      <div style={{
        padding: "16px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-sidebar)", position: "sticky", top: 0, zIndex: 1,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            {isLoading ? (
              <>
                <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={12} />
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                    {parcel?.plot_number}
                  </span>
                  {parcel?.has_conflict && (
                    <span className="badge badge-red">
                      <AlertTriangle size={9} /> Conflict
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 11 }}>
                  <Hash size={10} />
                  <span style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em" }}>
                    {parcel?.ulpin}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6, padding: 6, cursor: "pointer", color: "var(--text-muted)" }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Meta row */}
        {!isLoading && parcel && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <span className="badge badge-blue">{parcel.land_use}</span>
            <span className="badge badge-muted">
              <MapPin size={9} /> {parcel.ward_name}
            </span>
            <span className="badge badge-muted">
              <Maximize2 size={9} /> {(parcel.area_sqm).toFixed(0)} m²
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <ActionButton icon={FileText} label="Issue Notice" danger />
          <ActionButton icon={Printer}  label="Print Profile" />
          <ActionButton icon={Shield}   label="Verify" />
        </div>
      </div>

      {/* Address */}
      {!isLoading && parcel?.address && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "flex-start" }}>
          <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} />
          {parcel.address}
        </div>
      )}

      {/* Independent panels — each has own SWR + skeleton */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <OwnershipPanel  ulpin={activeULPIN} />
        <FiscalPanel     ulpin={activeULPIN} />
        <UtilitiesPanel  ulpin={activeULPIN} />
        <InfraPanel      ulpin={activeULPIN} />
      </div>
    </aside>
  );
}
