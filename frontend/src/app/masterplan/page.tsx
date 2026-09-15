"use client";

import { MapPin, FileText, Calendar, Lock } from "lucide-react";

const ZONES = [
  { code: "R-1", name: "Low-Density Residential", color: "#FEF08A", desc: "Maximum 3 floors, FAR 1.0, min 150 sqm plot" },
  { code: "R-2", name: "Medium-Density Residential", color: "#86EFAC", desc: "Up to 6 floors, FAR 1.5, min 100 sqm plot" },
  { code: "C-1", name: "Neighbourhood Commercial", color: "#FED7AA", desc: "Ground floor retail permitted, 4 floor max" },
  { code: "C-2", name: "District Commercial", color: "#FDBA74", desc: "Mixed-use, 8 floors, ground + 2 commercial" },
  { code: "IN",  name: "Light Industrial", color: "#D1D5DB", desc: "Non-polluting industries, no residential" },
  { code: "GR",  name: "Green / Park", color: "#6EE7B7", desc: "No construction, open to public" },
  { code: "PF",  name: "Public Facility", color: "#A5B4FC", desc: "Schools, hospitals, civic buildings" },
];

export default function MasterplanPage() {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg-primary)", padding: "20px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.02em" }}>
          Masterplan — Mohali 2031
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Zoning regulations and land-use designations per Greater Mohali Area Development Authority (GMADA) Masterplan 2031
        </p>
      </div>

      {/* Coming soon banner */}
      <div style={{
        background: "rgba(2,132,199,0.06)", border: "1px solid rgba(2,132,199,0.2)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Lock size={18} color="var(--accent)" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>Interactive Zoning Layer — Coming Soon</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            The GIS overlay of GMADA masterplan zones will be visible on the map. Download the official PDF below.
          </div>
        </div>
      </div>

      {/* Zoning legend */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
          Zoning Categories
        </div>
        <div style={{ padding: "4px 0" }}>
          {ZONES.map(z => (
            <div key={z.code} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 18px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ width: 36, height: 24, borderRadius: 5, background: z.color, flexShrink: 0, border: "1px solid rgba(0,0,0,0.08)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  <span style={{ color: "var(--accent)", marginRight: 6 }}>[{z.code}]</span>{z.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{z.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
          Official Documents
        </div>
        {[
          { title: "GMADA Masterplan 2031 — Main Document", date: "2011", size: "12.4 MB" },
          { title: "Zoning Regulations & Building Bylaws", date: "2019", size: "4.1 MB" },
          { title: "Sector-wise Land Use Map", date: "2022", size: "28.6 MB" },
        ].map(doc => (
          <div key={doc.title} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
          }}>
            <FileText size={18} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{doc.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                <Calendar size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{doc.date} · {doc.size}
              </div>
            </div>
            <button style={{
              padding: "6px 14px", background: "var(--accent-dim)", color: "var(--accent)",
              border: "1px solid var(--border-accent)", borderRadius: 7, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}>Download</button>
          </div>
        ))}
      </div>
    </div>
  );
}
