"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/lib/store";

if (typeof window !== 'undefined') {
  maplibregl.setWorkerCount(1);
  maplibregl.setWorkerUrl('https://unpkg.com/maplibre-gl@6.9.0/dist/maplibre-gl-worker.mjs');
}

const BENGALURU_CENTER: [number, number] = [77.5946, 12.9716];
const TILESERV_URL = process.env.NEXT_PUBLIC_TILESERV_URL || "http://localhost:7800";

const LAND_USE_COLORS: Record<string, string> = {
  Residential: "#3B82F6",
  Commercial: "#F59E0B",
  Industrial: "#EF4444",
  Agricultural: "#10B981",
  Mixed: "#8B5CF6",
};

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19
    }
  },
  layers: [
    {
      id: "osm-bg",
      type: "raster",
      source: "osm",
      paint: { "raster-opacity": 0.95 }
    }
  ]
};

export default function MapView() {
  const { activeLayers, activeULPIN, setActiveULPIN, setMapBBox } = useMapStore();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [debugLog, setDebugLog] = useState<string>("Initializing map...");
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: BENGALURU_CENTER,
      zoom: 12,
    });

    mapRef.current = map;

    map.on('load', () => {
      setDebugLog("Map style loaded, adding layers...");

      // ── TEST LAYER: Whole city of Bengaluru
      map.addSource('bengaluru-test', {
        type: 'geojson',
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[[77.4, 12.8], [77.7, 12.8], [77.7, 13.1], [77.4, 13.1], [77.4, 12.8]]] },
            properties: {}
          }]
        }
      });
      map.addLayer({
        id: "bengaluru-test-fill",
        type: "fill",
        source: "bengaluru-test",
        paint: { "fill-color": "#2563EB", "fill-opacity": 0.4 }
      });

      // ── Parcel tiles from pg_tileserv
      map.addSource('parcels', {
        type: "vector",
        tiles: [`${TILESERV_URL}/public.parcels_tile_view/{z}/{x}/{y}.pbf`],
        minzoom: 0,
        maxzoom: 22
      });

      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        "source-layer": "public.parcels_tile_view",
        source: "parcels",
        paint: {
          "fill-color": [
            "match", ["get", "land_use"],
            "Residential", LAND_USE_COLORS.Residential,
            "Commercial", LAND_USE_COLORS.Commercial,
            "Industrial", LAND_USE_COLORS.Industrial,
            "Agricultural", LAND_USE_COLORS.Agricultural,
            "Mixed", LAND_USE_COLORS.Mixed,
            "#4A5568",
          ],
          "fill-opacity": 0.60,
        }
      });

      map.addLayer({
        id: "parcels-line",
        type: "line",
        "source-layer": "public.parcels_tile_view",
        source: "parcels",
        paint: {
          "line-color": "#333",
          "line-width": 1,
        }
      });

      // Map Events
      map.on('click', 'parcels-fill', (e) => {
        const feature = e.features?.[0];
        if (feature && feature.properties.ulpin) {
          setActiveULPIN(feature.properties.ulpin);
        }
      });

      map.on('mousemove', 'parcels-fill', (e) => {
        const feature = e.features?.[0];
        if (feature) {
          map.getCanvas().style.cursor = 'pointer';
          setHoverInfo({ feature, x: e.point.x, y: e.point.y });
        }
      });

      map.on('mouseleave', 'parcels-fill', () => {
        map.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });

      map.on('moveend', () => {
        const b = map.getBounds();
        setMapBBox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      });

      const updateDebug = () => {
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            setDebugLog("Active Layers: " + style.layers.map((l: any) => l.id).join(", "));
          }
        } catch (err: any) {
          setDebugLog("Error: " + err.message);
        }
      };

      map.on('idle', updateDebug);
      map.on('styledata', updateDebug);
      updateDebug();
    });

  }, []);

  // Update dynamic parcel styling when activeULPIN changes
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getLayer('parcels-line')) return;
    mapRef.current.setPaintProperty('parcels-line', 'line-color', [
      "case", ["==", ["get", "ulpin"], activeULPIN || ""], "#00C896", "#333"
    ]);
    mapRef.current.setPaintProperty('parcels-line', 'line-width', [
      "case", ["==", ["get", "ulpin"], activeULPIN || ""], 4, 1
    ]);
  }, [activeULPIN]);

  // Sync reactive layers from the sidebar toggles
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const [cx, cy] = BENGALURU_CENTER;

    const syncLayer = (sourceId: string, active: boolean, sourceDef: any, layerDefs: any[]) => {
      // if (!map.getStyle() || !map.isStyleLoaded()) return;
      if (active) {
        if (!map.getSource(sourceId)) map.addSource(sourceId, sourceDef);
        for (const layer of layerDefs) {
          if (!map.getLayer(layer.id)) map.addLayer(layer);
        }
      } else {
        for (const layer of layerDefs) {
          if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        }
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };

    const runSync = () => {
      // ── Water Lines
      syncLayer('water-lines', !!activeLayers.waterLines, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", geometry: { type: "LineString", coordinates: [[cx - 0.004, cy - 0.003], [cx + 0.001, cy - 0.0015], [cx + 0.0045, cy + 0.002]] }, properties: {} },
            { type: "Feature", geometry: { type: "LineString", coordinates: [[cx - 0.003, cy - 0.005], [cx - 0.003, cy + 0.005]] }, properties: {} },
            { type: "Feature", geometry: { type: "LineString", coordinates: [[cx + 0.001, cy + 0.0035], [cx + 0.005, cy + 0.001]] }, properties: {} },
          ]
        }
      }, [{ id: 'water-lines-layer', type: 'line', paint: { "line-color": "#3B82F6", "line-width": 3, "line-opacity": 0.85 } }]);

      // ── Power Grid
      syncLayer('power-grid', !!activeLayers.powerGrid, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", geometry: { type: "LineString", coordinates: [[cx - 0.005, cy + 0.001], [cx + 0.005, cy + 0.001]] }, properties: {} },
            { type: "Feature", geometry: { type: "LineString", coordinates: [[cx + 0.002, cy - 0.004], [cx + 0.002, cy + 0.004]] }, properties: {} },
          ]
        }
      }, [{ id: 'power-grid-layer', type: 'line', paint: { "line-color": "#F59E0B", "line-width": 2.5, "line-opacity": 0.9 } }]);

      // ── Tax Defaulters
      syncLayer('tax-heat', !!activeLayers.taxDefaulters, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: Array.from({ length: 15 }, () => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [cx + (Math.random() - 0.5) * 0.01, cy + (Math.random() - 0.5) * 0.008] },
            properties: { w: Math.random() },
          }))
        }
      }, [{
        id: 'tax-defaulters-heat', type: 'heatmap', paint: {
          "heatmap-weight": ["get", "w"], "heatmap-intensity": 2, "heatmap-radius": 45, "heatmap-opacity": 0.75,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(239,68,68,0)", 0.5, "rgba(239,68,68,0.5)", 1, "rgba(239,68,68,1)"]
        }
      }]);

      // ── Zoning Restrictions
      syncLayer('zoning', !!activeLayers.zoningRestrictions, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", geometry: { type: "Polygon", coordinates: [[[cx - 0.003, cy - 0.002], [cx + 0.001, cy - 0.002], [cx + 0.001, cy + 0.002], [cx - 0.003, cy + 0.002], [cx - 0.003, cy - 0.002]]] }, properties: { zone: "Commercial" } },
            { type: "Feature", geometry: { type: "Polygon", coordinates: [[[cx + 0.0015, cy - 0.0025], [cx + 0.005, cy - 0.0025], [cx + 0.005, cy + 0.001], [cx + 0.0015, cy + 0.001], [cx + 0.0015, cy - 0.0025]]] }, properties: { zone: "Industrial" } },
          ]
        }
      }, [
        { id: 'zoning-fill', type: 'fill', paint: { "fill-color": ["match", ["get", "zone"], "Commercial", "#F59E0B", "Industrial", "#EF4444", "#8B5CF6"], "fill-opacity": 0.5 } },
        { id: 'zoning-outline', type: 'line', paint: { "line-color": ["match", ["get", "zone"], "Commercial", "#F59E0B", "Industrial", "#EF4444", "#8B5CF6"], "line-width": 3, "line-opacity": 0.8 } }
      ]);
    };

    if (map.isStyleLoaded()) {
      runSync();
    } else {
      map.once('idle', runSync);
    }
  }, [activeLayers]);

  // ── Polygon drawing ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let drawMode = false;
    let coords: [number, number][] = [];
    let resourceIds: string[] = [];

    const cleanup = () => {
      for (const id of resourceIds) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      }
      resourceIds = [];
      coords = [];
    };

    const renderPreview = (pts: [number, number][]) => {
      cleanup();
      if (pts.length === 0) return;

      map.addSource("draw-pts-src", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: pts.map((c, i) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: c },
            properties: { i },
          })),
        },
      });
      map.addLayer({
        id: "draw-pts-layer",
        type: "circle",
        source: "draw-pts-src",
        paint: {
          "circle-radius": 5,
          "circle-color": "#00C896",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      resourceIds.push("draw-pts-src", "draw-pts-layer");

      if (pts.length >= 2) {
        map.addSource("draw-line-src", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: pts },
            properties: {},
          },
        });
        map.addLayer({
          id: "draw-line-layer",
          type: "line",
          source: "draw-line-src",
          paint: {
            "line-color": "#00C896",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
        resourceIds.push("draw-line-src", "draw-line-layer");
      }
    };

    const finishPolygon = () => {
      drawMode = false;
      map.getCanvas().style.cursor = "";
      map.dragPan.enable();

      if (coords.length < 3) {
        cleanup();
        return;
      }

      const closed = [...coords, coords[0]];
      const polygon = {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [closed] },
        properties: {},
      };

      cleanup();

      map.addSource("draw-final-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [polygon] },
      });
      map.addLayer({
        id: "draw-final-fill",
        type: "fill",
        source: "draw-final-src",
        paint: { "fill-color": "#00C896", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "draw-final-line",
        type: "line",
        source: "draw-final-src",
        paint: { "line-color": "#00C896", "line-width": 3 },
      });
      resourceIds = ["draw-final-src", "draw-final-fill", "draw-final-line"];

      window.dispatchEvent(
        new CustomEvent("bhoomi:draw-complete", { detail: { polygon } })
      );
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawMode) return;
      coords.push([e.lngLat.lng, e.lngLat.lat]);
      renderPreview(coords);
    };

    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawMode) return;
      e.preventDefault();
      finishPolygon();
    };

    const onDrawStart = () => {
      drawMode = true;
      coords = [];
      cleanup();
      map.getCanvas().style.cursor = "crosshair";
      map.dragPan.disable();
    };

    const onDrawClear = () => {
      drawMode = false;
      cleanup();
      map.getCanvas().style.cursor = "";
      map.dragPan.enable();
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    window.addEventListener("bhoomi:draw-start", onDrawStart);
    window.addEventListener("bhoomi:draw-clear", onDrawClear);

    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      window.removeEventListener("bhoomi:draw-start", onDrawStart);
      window.removeEventListener("bhoomi:draw-clear", onDrawClear);
      cleanup();
    };
  }, []);

  // Handle active ULPIN flying
  useEffect(() => {
    if (activeULPIN && mapRef.current) {
      const map = mapRef.current;
      const features = map.querySourceFeatures("parcels", {
        sourceLayer: "public.parcels_tile_view",
        filter: ["==", "ulpin", activeULPIN]
      });

      if (features.length > 0) {
        const geom = features[0].geometry as any;
        let coords: [number, number] | null = null;
        if (geom.type === "Polygon") coords = geom.coordinates[0][0];
        else if (geom.type === "MultiPolygon") coords = geom.coordinates[0][0][0];

        if (coords) {
          map.flyTo({ center: coords, zoom: 19, essential: true });
        }
      } else {
        map.flyTo({ center: BENGALURU_CENTER, zoom: 19, essential: true });
      }
    }
  }, [activeULPIN]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Tooltip */}
      {hoverInfo && hoverInfo.feature && hoverInfo.feature.properties.ulpin && (
        <div style={{
          position: "absolute",
          left: hoverInfo.x + 10,
          top: hoverInfo.y + 10,
          backgroundColor: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          pointerEvents: "none",
          fontSize: "12px",
          fontWeight: "bold",
          zIndex: 100
        }}>
          ULPIN: {hoverInfo.feature.properties.ulpin}
        </div>
      )}

      {/* Debug internal MapLibre state */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "rgba(0,0,0,0.8)",
        color: "#10B981",
        padding: "10px",
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "12px",
        maxWidth: "400px",
        wordWrap: "break-word",
        zIndex: 9999,
        pointerEvents: "none"
      }}>
        {debugLog}
      </div>
    </div>
  );
}
