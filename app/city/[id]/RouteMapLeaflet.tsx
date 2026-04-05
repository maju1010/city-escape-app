"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RoutePoint = {
  lat: number;
  lon: number;
  order: number;
  title: string;
};

type Props = {
  points: RoutePoint[];
  playerLat?: number | null;
  playerLon?: number | null;
};

export default function RouteMapLeaflet({ points, playerLat, playerLon }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || points.length === 0) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Numbered gold pins for each task
    points.forEach((pt) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;
          background:#78350f;
          border:2px solid #f59e0b;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.7);
        "><span style="transform:rotate(45deg);color:#fbbf24;font-size:11px;font-weight:bold;line-height:1;">${pt.order}</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      L.marker([pt.lat, pt.lon], { icon })
        .bindTooltip(pt.title, { direction: "top", offset: [0, -30], className: "" })
        .addTo(map);
    });

    // Dotted polyline connecting the route
    if (points.length > 1) {
      const latlngs = points.map((p) => [p.lat, p.lon] as [number, number]);
      L.polyline(latlngs, {
        color: "#f59e0b",
        weight: 2,
        opacity: 0.6,
        dashArray: "6, 8",
      }).addTo(map);
    }

    // Player marker if available
    if (playerLat != null && playerLon != null) {
      const playerIcon = L.divIcon({
        className: "",
        html: `<div class="player-marker-dot" style="width:12px;height:12px;background:#3b82f6;border-radius:50%;border:2px solid #fff;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      playerMarkerRef.current = L.marker([playerLat, playerLon], { icon: playerIcon }).addTo(map);
    }

    // Fit all points
    const allLats = points.map((p) => p.lat);
    const allLons = points.map((p) => p.lon);
    if (playerLat != null) allLats.push(playerLat);
    if (playerLon != null) allLons.push(playerLon);
    const bounds = L.latLngBounds(
      [Math.min(...allLats), Math.min(...allLons)],
      [Math.max(...allLats), Math.max(...allLons)]
    );
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update player marker when GPS changes
  useEffect(() => {
    if (playerMarkerRef.current && playerLat != null && playerLon != null) {
      playerMarkerRef.current.setLatLng([playerLat, playerLon]);
    }
  }, [playerLat, playerLon]);

  return <div ref={containerRef} style={{ width: "100%", height: "240px" }} />;
}
