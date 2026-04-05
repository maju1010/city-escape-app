"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { RoutePoint } from "./RouteMapLeaflet";

const RouteMapLeaflet = dynamic(() => import("./RouteMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] rounded-xl bg-bg-card border border-amber-900/30 flex items-center justify-center text-text-tertiary text-sm">
      Indlæser kort…
    </div>
  ),
});

// Haversine distance in metres
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalRouteMeters(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
  }
  return total;
}

export default function ScenarioRouteMap({ points }: { points: RoutePoint[] }) {
  const [playerPos, setPlayerPos] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setPlayerPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (points.length === 0) return null;

  const totalM = totalRouteMeters(points);
  const totalKm = (totalM / 1000).toFixed(1);
  const walkMinutes = Math.round(totalM / 83); // ~5 km/h walking

  return (
    <div className="mb-6">
      <div className="rounded-xl overflow-hidden border border-amber-900/30">
        <RouteMapLeaflet
          points={points}
          playerLat={playerPos?.lat}
          playerLon={playerPos?.lon}
        />
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <p className="text-text-tertiary text-xs">
          Ruten er ca.{" "}
          <span className="text-amber-700 font-semibold">{totalKm} km</span>
          {" "}og tager ca.{" "}
          <span className="text-amber-700 font-semibold">{walkMinutes} min</span>
          {" "}at gå
        </p>
        <p className="text-text-tertiary text-xs">{points.length} stop</p>
      </div>
    </div>
  );
}
