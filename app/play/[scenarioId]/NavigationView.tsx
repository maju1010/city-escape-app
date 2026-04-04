"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Task } from "./GameClient";
import { getLocationImage } from "@/lib/locationImages";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] rounded-xl bg-[#14131f] border border-amber-900/30 flex items-center justify-center text-[#4a4560] text-sm">
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

// Bearing in degrees (0 = north, clockwise)
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

type Props = {
  task: Task;
  onArrived: () => void;
  onSkip: () => void;
};

export default function NavigationView({ task, onArrived, onSkip }: Props) {
  const [playerPos, setPlayerPos] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number>(0); // degrees from north
  const [orientationGranted, setOrientationGranted] = useState(false);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState(false);

  // Geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Din browser understøtter ikke GPS.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setPlayerPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoError("Kunne ikke hente din placering."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Device orientation
  const startOrientation = useCallback(() => {
    function handler(e: DeviceOrientationEvent) {
      // iOS gives webkitCompassHeading (clockwise from north)
      // Standard gives alpha (counterclockwise from north)
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (ios !== undefined && ios !== null) {
        setHeading(ios);
      } else if (e.alpha !== null) {
        setHeading((360 - e.alpha) % 360);
      }
    }
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  useEffect(() => {
    const DevOri = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DevOri.requestPermission === "function") {
      setNeedsOrientationPermission(true);
    } else {
      startOrientation();
      setOrientationGranted(true);
    }
  }, [startOrientation]);

  async function requestOrientationPermission() {
    const DevOri = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DevOri.requestPermission === "function") {
      const result = await DevOri.requestPermission();
      if (result === "granted") {
        startOrientation();
        setOrientationGranted(true);
      }
    }
    setNeedsOrientationPermission(false);
  }

  const distance =
    playerPos ? haversine(playerPos.lat, playerPos.lon, task.latitude, task.longitude) : null;
  const bearing =
    playerPos ? getBearing(playerPos.lat, playerPos.lon, task.latitude, task.longitude) : 0;
  const needleRotation = bearing - heading;
  const isNearby = distance !== null && distance <= 50;

  const [imgError, setImgError] = useState(false);
  const imgSrc = getLocationImage(task.location_name || "", task.image_url);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Location image */}
      <div className="relative h-40 w-full overflow-hidden bg-[#1a1828]">
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={task.location_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f0e17]" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-amber-400 font-bold text-lg leading-tight drop-shadow">
            {task.location_name}
          </p>
          <p className="text-[#a09880] text-sm">Naviger til lokationen</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 pb-20 max-w-lg mx-auto w-full flex flex-col gap-5">
        {/* Distance */}
        <div className="bg-[#1a1828] border border-amber-900/40 rounded-xl px-5 py-4 text-center">
          {geoError ? (
            <p className="text-[#a09880] text-sm">{geoError}</p>
          ) : distance === null ? (
            <p className="text-[#6b6380] text-sm">Henter din placering…</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-amber-300 tabular-nums">
                {distance < 1000
                  ? `${Math.round(distance)} m`
                  : `${(distance / 1000).toFixed(1)} km`}
              </p>
              <p className="text-[#a09880] text-sm mt-1">fra {task.location_name}</p>
              {isNearby && (
                <p className="text-green-400 text-xs mt-1 font-semibold">
                  ✓ Du er fremme!
                </p>
              )}
            </>
          )}
        </div>

        {/* Map */}
        {playerPos ? (
          <div className="rounded-xl overflow-hidden border border-amber-900/30">
            <MapComponent
              playerLat={playerPos.lat}
              playerLon={playerPos.lon}
              destLat={task.latitude}
              destLon={task.longitude}
            />
          </div>
        ) : (
          <div className="w-full h-[220px] rounded-xl bg-[#14131f] border border-amber-900/30 flex items-center justify-center text-[#4a4560] text-sm">
            Venter på GPS…
          </div>
        )}

        {/* Compass */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-[#6b6380] tracking-widest uppercase">Kompas</p>

          {needsOrientationPermission && !orientationGranted ? (
            <button
              onClick={requestOrientationPermission}
              className="text-amber-600 hover:text-amber-400 text-sm underline underline-offset-2 transition-colors"
            >
              Aktivér kompas (kræver tilladelse)
            </button>
          ) : (
            <div className="relative w-36 h-36">
              {/* Compass ring */}
              <svg viewBox="0 0 144 144" className="w-full h-full">
                {/* Outer ring */}
                <circle cx="72" cy="72" r="68" fill="#14131f" stroke="#78350f" strokeWidth="2" />
                {/* Inner ring */}
                <circle cx="72" cy="72" r="58" fill="none" stroke="#1a1828" strokeWidth="1" />
                {/* Tick marks */}
                {Array.from({ length: 36 }).map((_, i) => {
                  const angle = (i * 10 * Math.PI) / 180;
                  const isMajor = i % 9 === 0;
                  const r1 = isMajor ? 55 : 57;
                  const r2 = 62;
                  return (
                    <line
                      key={i}
                      x1={72 + r1 * Math.sin(angle)}
                      y1={72 - r1 * Math.cos(angle)}
                      x2={72 + r2 * Math.sin(angle)}
                      y2={72 - r2 * Math.cos(angle)}
                      stroke={isMajor ? "#78350f" : "#2a2840"}
                      strokeWidth={isMajor ? 2 : 1}
                    />
                  );
                })}
                {/* Cardinal labels */}
                <text x="72" y="20" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">N</text>
                <text x="72" y="132" textAnchor="middle" fill="#6b6380" fontSize="11">S</text>
                <text x="132" y="76" textAnchor="middle" fill="#6b6380" fontSize="11">Ø</text>
                <text x="12" y="76" textAnchor="middle" fill="#6b6380" fontSize="11">V</text>
                {/* Center dot */}
                <circle cx="72" cy="72" r="5" fill="#1a1828" stroke="#78350f" strokeWidth="1.5" />
              </svg>

              {/* Rotating needle */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                style={{ transform: `rotate(${needleRotation}deg)` }}
              >
                <svg viewBox="0 0 144 144" className="w-full h-full absolute inset-0">
                  {/* Arrow pointing up = toward destination */}
                  <polygon
                    points="72,20 66,72 72,80 78,72"
                    fill="#f59e0b"
                    opacity="0.95"
                  />
                  <polygon
                    points="72,80 66,72 72,118 78,72"
                    fill="#44403c"
                    opacity="0.8"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-auto pb-4">
          <div>
            <button
              onClick={onArrived}
              disabled={!isNearby && !geoError}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
                isNearby || geoError
                  ? "bg-amber-600 hover:bg-amber-500 text-[#0f0e17]"
                  : "bg-[#1a1828] border border-amber-900/30 text-[#4a4560] cursor-not-allowed"
              }`}
            >
              Jeg er fremme →
            </button>
            {!isNearby && !geoError && (
              <p className="text-center text-[#4a4560] text-xs mt-2">
                Kom tættere på for at låse op
              </p>
            )}
          </div>

        </div>
      </div>
    </div>

    {/* Fixed skip button — always reachable on mobile */}
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-4 pt-3 bg-gradient-to-t from-[#0f0e17] to-transparent pointer-events-none">
      <button
        onClick={onSkip}
        className="pointer-events-auto text-[#4a4560] hover:text-amber-700 text-sm underline underline-offset-2 transition-colors px-4 py-2"
      >
        Spring navigation over
      </button>
    </div>
  );
}
