/**
 * Global Zustand store for BhoomiSync.
 *
 * Design: one flat store with selectors to prevent over-rendering.
 * Components subscribe only to the slice they need.
 */

import { create } from "zustand";
import { ConflictAlert } from "./api";

export interface LayerState {
  waterLines: boolean;
  powerGrid: boolean;
  taxDefaulters: boolean;
  zoningRestrictions: boolean;
}

export interface DrawResult {
  parcel_count: number;
  total_area_sqm: number;
  total_pending_tax: number;
  defaulter_count: number;
}

export interface DefaulterMarker {
  ulpin: string;
  coordinates: [number, number];
  owner_name?: string;
  amount_due?: number;
}

interface MapStore {
  // Active parcel
  activeULPIN: string | null;
  setActiveULPIN: (ulpin: string | null) => void;

  // Map bounding box [west, south, east, north]
  mapBBox: [number, number, number, number] | null;
  setMapBBox: (bbox: [number, number, number, number]) => void;

  // Layer toggles
  activeLayers: LayerState;
  toggleLayer: (layer: keyof LayerState) => void;

  // Conflict alerts (fetched from API on load)
  alerts: ConflictAlert[];
  setAlerts: (alerts: ConflictAlert[]) => void;

  // Defaulter markers
  defaulterMarkers: DefaulterMarker[];
  setDefaulterMarkers: (markers: DefaulterMarker[]) => void;
  addDefaulterMarker: (marker: DefaulterMarker) => void;
  clearDefaulterMarkers: () => void;

  // Draw mode
  drawActive: boolean;
  setDrawActive: (active: boolean) => void;
  drawResult: DrawResult | null;
  setDrawResult: (result: DrawResult | null) => void;

  // Time slider (ownership history year)
  historyYear: number;
  setHistoryYear: (year: number) => void;

  // Sidebar visibility
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  activeULPIN: null,
  setActiveULPIN: (ulpin) =>
    set({ activeULPIN: ulpin, sidebarOpen: ulpin !== null }),

  mapBBox: null,
  setMapBBox: (bbox) => set({ mapBBox: bbox }),

  activeLayers: {
    waterLines: false,
    powerGrid: false,
    taxDefaulters: false,
    zoningRestrictions: false,
  },
  toggleLayer: (layer) =>
    set((s) => ({
      activeLayers: {
        ...s.activeLayers,
        [layer]: !s.activeLayers[layer],
      },
    })),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),

  defaulterMarkers: [],
  setDefaulterMarkers: (markers) => set({ defaulterMarkers: markers }),
  addDefaulterMarker: (marker) =>
    set((state) => ({ defaulterMarkers: [...state.defaulterMarkers, marker] })),
  clearDefaulterMarkers: () => set({ defaulterMarkers: [] }),

  drawActive: false,
  setDrawActive: (active) => set({ drawActive: active }),
  drawResult: null,
  setDrawResult: (result) => set({ drawResult: result }),

  historyYear: new Date().getFullYear(),
  setHistoryYear: (year) => set({ historyYear: year }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
