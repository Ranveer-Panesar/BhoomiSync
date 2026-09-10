"use client";

import dynamic from "next/dynamic";
import PlotProfile from "@/components/sidebar/PlotProfile";
import LayerControl from "@/components/map/LayerControl";
import DrawTool from "@/components/map/DrawTool";
import TimeSlider from "@/components/map/TimeSlider";
import { useMapStore } from "@/lib/store";

// Dynamic import so MapLibre GL JS (canvas) doesn't SSR
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function MapPage() {
  const { sidebarOpen } = useMapStore();

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Map area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MapView />
        <LayerControl />
        <DrawTool />
        <TimeSlider />

        {/* Empty state hint */}
        {!sidebarOpen && (
          <div style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "8px 16px", pointerEvents: "none",
            fontSize: 12, color: "var(--text-muted)", zIndex: 5,
            backdropFilter: "blur(8px)",
          }}>
            Click on a parcel to view its full profile →
          </div>
        )}
      </div>

      {/* Right panel */}
      <PlotProfile />
    </div>
  );
}
