"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map, Layers, Shield, Home,
  FileText, MessageSquare, IndianRupee, MapPin, Settings,
} from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";

const WORKSPACE = [
  { icon: Home,          label: "Dashboard",          href: "/" },
  { icon: Map,           label: "GIS Map",             href: "/map" },
  { icon: FileText,      label: "Parcel Intelligence", href: "/parcel" },
];

const SERVICES = [
  { icon: MessageSquare, label: "Complaints",     href: "/complaints", badge: true },
  { icon: IndianRupee,   label: "Revenue & Dues", href: "/analytics" },
  { icon: MapPin,        label: "Masterplan",     href: "/masterplan" },
];

const ADMIN = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

function NavGroup({ title, items, pathname, complaintCount }: {
  title: string;
  items: typeof WORKSPACE;
  pathname: string;
  complaintCount?: number;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: "var(--text-muted)", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        padding: "0 8px 6px",
      }}>
        {title}
      </div>
      {items.map(({ icon: Icon, label, href, badge }: any) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link ${active ? "active" : ""}`}
            style={{ marginBottom: 2, fontSize: 13, fontWeight: active ? 600 : 400, position: "relative" }}
          >
            <Icon size={15} strokeWidth={active ? 2.5 : 2} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && complaintCount && complaintCount > 0 ? (
              <span style={{
                background: "var(--red)", color: "#fff", borderRadius: 10,
                fontSize: 10, fontWeight: 700, padding: "1px 6px", lineHeight: 1.6,
              }}>
                {complaintCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const { data: complaints } = useSWR<any[]>("/api/complaints?status=Open", fetcher, {
    refreshInterval: 60_000,
  });
  const openCount = complaints?.length ?? 0;

  return (
    <aside style={{
      width: 220, minWidth: 220,
      background: "var(--bg-sidebar)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      padding: "0", zIndex: 10,
    }}>
      <div style={{ padding: "20px 16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(2,132,199,0.25)",
          }}>
            <Layers size={17} color="#fff" />
          </div>
          <div>
            <div
              style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.1, letterSpacing: "-0.02em" }}
              title="System for Unified Tracking of land Resource and Assets"
            >
              SUTRA
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, marginTop: 1 }}>
              Mohali Municipal Area
            </div>
          </div>
        </div>
      </div>

      <nav style={{ padding: "16px 8px", flex: 1, overflowY: "auto" }}>
        <NavGroup title="Workspace"          items={WORKSPACE} pathname={pathname} />
        <NavGroup title="Municipal Services" items={SERVICES}  pathname={pathname} complaintCount={openCount} />
        <NavGroup title="Administration"     items={ADMIN}     pathname={pathname} />
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Shield size={11} color="var(--accent)" />
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Dept of Land Resources, GoI
          </span>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          SUTRA v1.0 · SIH2026
        </div>
      </div>
    </aside>
  );
}
