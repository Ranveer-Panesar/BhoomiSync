"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Bell, TrendingUp, Layers, Map, Zap, MapPin } from "lucide-react";
import { useMapStore, DefaulterMarker } from "@/lib/store";
import { searchParcels, SearchResult, fetcher, ConflictAlert } from "@/lib/api";
import useSWR from "swr";

const DEBOUNCE_MS = 300;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TILESERV_URL = process.env.NEXT_PUBLIC_TILESERV_URL || "http://localhost:7800";

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 14px", minWidth: 140,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

export default function Topbar() {
  const { setActiveULPIN, alerts, setAlerts, defaulterMarkers, setDefaulterMarkers, addDefaulterMarker, clearDefaulterMarkers, toggleLayer, activeLayers } = useMapStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingDefaulters, setLoadingDefaulters] = useState(false);

  // Fetch conflict alerts for the bell icon
  const { data: alertData } = useSWR<ConflictAlert[]>("/api/conflicts/active?limit=10", fetcher, {
    refreshInterval: 30_000,
    onSuccess: (data) => setAlerts(data),
  });

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setDropdownOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchParcels(q);
        setResults(res);
        setDropdownOpen(res.length > 0);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const selectResult = (r: SearchResult) => {
    setActiveULPIN(r.ulpin);
    setQuery(r.owner_name || r.ulpin);
    setDropdownOpen(false);
  };

  const activeAlerts = alertData?.filter((a) => !a.resolved) ?? [];

  // Handle click on defaulter alert - drop a marker
  const handleDefaulterClick = async (ulpin: string) => {
    setActiveULPIN(ulpin);
    setAlertOpen(false);
    
    // Try to get parcel details to add as a defaulter marker
    try {
      const res = await fetch(`${API_BASE}/api/parcels/${ulpin}`);
      if (res.ok) {
        const parcel = await res.json();
        // Extract coordinates from geometry or use center
        let coords: [number, number] = [76.7179, 30.7046]; // Mohali center
        if (parcel.geometry) {
          const geom = parcel.geometry;
          if (geom.type === "Polygon") {
            coords = geom.coordinates[0][0] as [number, number];
          } else if (geom.type === "MultiPolygon") {
            coords = geom.coordinates[0][0][0] as [number, number];
          }
        }
        
        const marker: DefaulterMarker = {
          ulpin,
          coordinates: coords,
          owner_name: parcel.owner_name,
          amount_due: parcel.total_arrears || 0,
        };
        addDefaulterMarker(marker);
        
        // Enable the tax defaulters layer if not already enabled
        if (!activeLayers.taxDefaulters) {
          toggleLayer('taxDefaulters');
        }
      }
    } catch (err) {
      console.error("Failed to fetch parcel details:", err);
    }
  };

  // View all defaulters - fetch from analytics API and drop centroid pins
  const handleViewDefaulters = async () => {
    setLoadingDefaulters(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/defaulters`);
      if (!res.ok) throw new Error("Failed to fetch defaulters");
      const data: DefaulterMarker[] = await res.json();

      setDefaulterMarkers(data);

      // Enable the tax defaulters layer
      if (!activeLayers.taxDefaulters) {
        toggleLayer('taxDefaulters');
      }
      setAlertOpen(false);
    } catch (err) {
      console.error("Failed to fetch defaulters:", err);
    } finally {
      setLoadingDefaulters(false);
    }
  };

  return (
    <header style={{
      height: 60, display: "flex", alignItems: "center",
      padding: "0 16px", gap: 12,
      background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border)",
      position: "relative", zIndex: 20, flexShrink: 0,
    }}>
      {/* Search bar */}
      <div style={{ position: "relative", flex: "0 0 360px" }}>
        <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input
          ref={inputRef}
          className="search-input"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search ULPIN, Owner Name, Address..."
          style={{ width: "100%", padding: "8px 12px 8px 32px", fontSize: 13 }}
        />
        {searching && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <div style={{ width: 12, height: 12, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        )}

        {/* Autocomplete dropdown */}
        {dropdownOpen && (
          <div className="fade-in" style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            zIndex: 100,
          }}>
            {results.map((r, i) => (
              <div
                key={r.ulpin}
                onClick={() => selectResult(r)}
                style={{
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                      {r.owner_name || r.plot_number}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                      {r.address || r.ulpin}
                    </div>
                  </div>
                  <span className="badge badge-muted">{r.ulpin}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 8, flex: 1, overflow: "hidden" }}>
        <KpiCard label="Registered ULPINs" value="30" icon={Map} color="#0284C7" />
        <KpiCard label="Active Alerts" value={activeAlerts.length} icon={Zap} color="#EF4444" />
        <KpiCard label="Tax Collection" value="76.4%" icon={TrendingUp} color="#D97706" />
        <KpiCard label="Active Utilities" value="58" icon={Layers} color="#0F766E" />
      </div>

      {/* Alert Bell */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setAlertOpen((o) => !o)}
          style={{
            background: activeAlerts.length > 0 ? "var(--red-dim)" : "var(--bg-card)",
            border: `1px solid ${activeAlerts.length > 0 ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
            borderRadius: 8, padding: "8px 10px", cursor: "pointer",
            position: "relative", display: "flex", alignItems: "center", gap: 6,
            color: activeAlerts.length > 0 ? "var(--red)" : "var(--text-secondary)",
            transition: "all 0.2s",
          }}
        >
          <Bell size={15} />
          {activeAlerts.length > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: "var(--red)", color: "#fff",
              borderRadius: "50%", width: 16, height: 16,
              fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {activeAlerts.length}
            </span>
          )}
        </button>

        {/* Alert dropdown */}
        {alertOpen && (
          <div className="fade-in" style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            zIndex: 100,
          }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>
              Active Conflict Alerts
            </div>
            {activeAlerts.length === 0 ? (
              <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}>No active alerts</div>
            ) : (
              <>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {activeAlerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => handleDefaulterClick(a.ulpin || "")}
                    style={{
                      padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span className={`badge ${a.severity === "High" ? "badge-red" : "badge-amber"}`}>{a.severity}</span>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{a.alert_type.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                          ULPIN: {a.ulpin || a.plot_number}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
                <div
                  onClick={handleViewDefaulters}
                  style={{
                    padding: "12px 16px", background: "var(--bg-card-hover)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontWeight: 600, fontSize: 13, color: "var(--text-primary)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <MapPin size={16} color="#EF4444" />
                  {loadingDefaulters ? "Loading..." : "View All Defaulters on Map"}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
