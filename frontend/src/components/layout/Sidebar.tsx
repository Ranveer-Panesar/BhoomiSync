"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  BarChart3,
  GitFork,
  Settings,
  Layers,
  Shield,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { icon: Map,       label: "Map View",        href: "/" },
  { icon: BarChart3, label: "Data Analytics",  href: "/analytics" },
  { icon: GitFork,   label: "Workflow",        href: "/workflow" },
  { icon: Settings,  label: "Admin Settings",  href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 18px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.2 }}>
              BhoomiSync
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
              Land Stack · SIH26014
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 8px 8px" }}>
          Navigation
        </div>
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}
              style={{ marginBottom: 2, fontSize: 13, fontWeight: active ? 600 : 400 }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer badge */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Shield size={12} color="var(--accent)" />
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Dept of Land Resources, GoI
          </span>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          v1.0.0 · Secure GIS Platform
        </div>
      </div>
    </aside>
  );
}
