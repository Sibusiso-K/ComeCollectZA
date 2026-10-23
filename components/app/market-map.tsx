"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MapPoint } from "@/lib/app/api";

// The middle of Soweto, used until there are pins to fit.
const SOWETO: [number, number] = [-26.25, 27.9];
const BUYER = "#2e9e5b";
const SELLER = "#f5b544";

function pinIcon(p: MapPoint, selected: boolean) {
  const colour = p.kind === "buy" ? BUYER : SELLER;
  const ring = selected ? "#ffffff" : "rgba(0,0,0,0.35)";
  const inner = p.source === "centre" ? "#ffffff" : "#0b2415";
  const size = selected ? 38 : 30;
  // Only fixed strings go in here. Names and notes never enter the HTML.
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${colour};border:3px solid ${ring};box-shadow:0 4px 10px rgba(0,0,0,.35)"><span style="width:10px;height:10px;border-radius:9999px;background:${inner}"></span></span>`,
  });
}

export default function MarketMap({
  points,
  selectedId,
  onSelect,
  picking,
  onPick,
  draft,
}: {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  picking: boolean;
  onPick: (lat: number, lng: number) => void;
  draft: { lat: number; lng: number } | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const draftPin = useRef<L.CircleMarker | null>(null);
  const fitted = useRef(false);
  const pickRef = useRef({ picking, onPick });
  pickRef.current = { picking, onPick };

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(SOWETO, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      if (pickRef.current.picking) pickRef.current.onPick(e.latlng.lat, e.latlng.lng);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  // Draw the pins.
  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    for (const p of points) {
      L.marker([p.lat, p.lng], { icon: pinIcon(p, p.id === selectedId), title: p.name, keyboard: true, riseOnHover: true })
        .on("click", () => onSelect(p.id))
        .addTo(g);
    }
    if (!fitted.current && points.length) {
      m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.25), { maxZoom: 14 });
      fitted.current = true;
    }
  }, [points, selectedId, onSelect]);

  // Show where a new post will go.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    draftPin.current?.remove();
    draftPin.current = null;
    if (draft) {
      draftPin.current = L.circleMarker([draft.lat, draft.lng], { radius: 11, color: "#ffffff", weight: 4, fillColor: "#e8452f", fillOpacity: 1 }).addTo(m);
      m.panTo([draft.lat, draft.lng]);
    }
  }, [draft]);

  return (
    <div
      ref={el}
      role="application"
      aria-label="Map of buyers and sellers"
      className="h-80 w-full overflow-hidden rounded-3xl"
      style={{ cursor: picking ? "crosshair" : undefined }}
    />
  );
}
