"use client";

import { useState } from "react";

type City = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  fallback_urls?: string[];
};

export default function ComingSoonCard({ city }: { city: City }) {
  const allUrls = [city.image_url, ...(city.fallback_urls ?? [])];
  const [urlIndex, setUrlIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  function handleError() {
    const next = urlIndex + 1;
    if (next < allUrls.length) {
      setUrlIndex(next);
    } else {
      setImgFailed(true);
    }
  }

  const currentUrl = allUrls[urlIndex];

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-900/20 cursor-default">
      {/* Background image */}
      <div className="relative h-44 w-full bg-[#1a1828] overflow-hidden">
        {!imgFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentUrl}
            src={currentUrl}
            alt={city.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleError}
          />
        )}
        {/* Dark overlay 60% */}
        <div className="absolute inset-0 bg-[#0f0e17]/60" />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/40 to-transparent" />

        {/* "Kommer snart" badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-amber-800/80 border border-amber-700/60 text-amber-300 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
            Kommer snart
          </span>
        </div>
      </div>

      {/* Text content */}
      <div className="relative bg-[#1a1828] px-5 pb-5 pt-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-[#6b6380]">{city.name}</h2>
        </div>
        {city.description && (
          <p className="text-[#4a4560] text-sm leading-relaxed">{city.description}</p>
        )}
      </div>
    </div>
  );
}
