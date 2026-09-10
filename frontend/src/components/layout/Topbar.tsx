"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Bell, TrendingUp, Layers, Map, Zap } from "lucide-react";
import { useMapStore } from "@/lib/store";
import { searchParcels, SearchResult } from "@/lib/api";
import useSWR from "swr";
import { fetcher, ConflictAlert } from "@/lib/api";

const DEBOUNCE_MS = 300;

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
  const { setActiveULPIN, alerts, setAlerts } = useMapStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <KpiCard label="Registered ULPINs" value="30" icon={Map} color="#00C896" />
        <KpiCard label="Active Alerts" value={activeAlerts.length} icon={Zap} color="#EF4444" />
        <KpiCard label="Tax Collection" value="76.4%" icon={TrendingUp} color="#F59E0B" />
        <KpiCard label="Active Utilities" value="58" icon={Layers} color="#2563EB" />
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
              activeAlerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  onClick={() => { if (a.ulpin) setActiveULPIN(a.ulpin); setAlertOpen(false); }}
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
              ))
            )}
          </div>
        )}
      </div>
    </header>
  );
}
