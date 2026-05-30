"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";

interface Props {
  pin: { lat: number; lng: number } | null;
  onPin: (lat: number, lng: number) => void;
  revealed: boolean;
  correctLat?: number;
  correctLng?: number;
  distanceKm?: number | null;
}

export default function MapGuess({ pin, onPin, revealed, correctLat, correctLng, distanceKm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const okMarkerRef  = useRef<L.Marker | null>(null);
  const lineRef      = useRef<L.Polyline | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Fix broken webpack default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center: [20, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;

      map.on("click", (e: L.LeafletMouseEvent) => {
        if (revealed) return;
        onPin(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update guess pin when player clicks
  useEffect(() => {
    if (!pin) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      if (pinMarkerRef.current) pinMarkerRef.current.remove();
      pinMarkerRef.current = L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;background:#c8102e;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.45)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(mapRef.current);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng]);

  // Reveal: show correct location, draw line
  useEffect(() => {
    if (!revealed || correctLat === undefined || correctLng === undefined) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      okMarkerRef.current?.remove();
      lineRef.current?.remove();

      okMarkerRef.current = L.marker([correctLat, correctLng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;background:#1a7a35;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.45)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(mapRef.current);

      if (pin) {
        lineRef.current = L.polyline(
          [[pin.lat, pin.lng], [correctLat, correctLng]],
          { color: "#666", weight: 1.5, dashArray: "5 4" },
        ).addTo(mapRef.current);

        mapRef.current.fitBounds(
          [[pin.lat, pin.lng], [correctLat, correctLng]],
          { padding: [24, 24], maxZoom: 10 },
        );
      } else {
        mapRef.current.setView([correctLat, correctLng], 8);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  const fmt = (km: number) =>
    km < 5 ? "Spot on!" : `${km < 100 ? Math.round(km) : Math.round(km / 10) * 10} km away`;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.2em] font-led" style={{ color: "var(--text-label)" }}>
        Stadium location
      </span>
      <div
        ref={containerRef}
        style={{
          height: "200px",
          width: "100%",
          borderRadius: "4px",
          border: "1px solid var(--border-dim)",
          overflow: "hidden",
          cursor: revealed ? "default" : "crosshair",
        }}
      />
      <p className="text-[11px] text-center" style={{ color: "var(--text-dim)", minHeight: "1em" }}>
        {revealed && distanceKm !== null && distanceKm !== undefined
          ? <span style={{ color: distanceKm < 25 ? "var(--green-led)" : distanceKm < 300 ? "#b85c00" : "var(--red-led)", fontWeight: 600 }}>{fmt(distanceKm)}</span>
          : !pin && !revealed
            ? "Click map to pin the stadium"
            : pin && !revealed
              ? "Pin placed — move it any time before submitting"
              : null
        }
      </p>
    </div>
  );
}
