import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: "SUTRA — System for Unified Tracking of land Resource and Assets",
  description:
    "SIH2026 — Department of Land Resources, Government of India. " +
    "Unified GIS-based Digital Public Infrastructure platform linking all " +
    "departmental land data via ULPIN (Bhu-Aadhaar) for Mohali Municipal Area.",
  keywords: ["GIS", "land records", "ULPIN", "Bhu-Aadhaar", "SUTRA", "cadastral", "Mohali"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <Topbar />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
