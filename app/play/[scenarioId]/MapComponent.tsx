"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  playerLat: number;
  playerLon: number;
  destLat: number;
  destLon: number;
};

export default function MapComponent({ playerLat, playerLon, destLat, destLon }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Player marker — blue pulsing dot
    const playerIcon = L.divIcon({
      className: "",
      html: `<div class="player-marker-dot" style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:2px solid #fff;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    // Destination marker — gold star
    const destIcon = L.divIcon({
      className: "",
      html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9));">⭐</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    playerMarkerRef.current = L.marker([playerLat, playerLon], { icon: playerIcon }).addTo(map);
    L.marker([destLat, destLon], { icon: destIcon }).addTo(map);

    // Fit both markers in view
    const bounds = L.latLngBounds(
      [playerLat, playerLon],
      [destLat, destLon]
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update player position
  useEffect(() => {
    playerMarkerRef.current?.setLatLng([playerLat, playerLon]);
  }, [playerLat, playerLon]);

  return <div ref={containerRef} style={{ width: "100%", height: "220px" }} />;
}
