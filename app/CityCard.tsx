"use client";

import Link from "next/link";
import { useState } from "react";

const CITY_IMAGES: Record<string, string> = {
  aarhus: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
};

function getCityImage(name: string, imageUrl: string | null): string {
  if (imageUrl) return imageUrl;
  const key = name.toLowerCase().trim();
  return CITY_IMAGES[key] || `https://picsum.photos/seed/${encodeURIComponent(name)}/800/400`;
}

type City = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export default function CityCard({ city }: { city: City }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = getCityImage(city.name, city.image_url);

  return (
    <Link href={`/city/${city.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-amber-900/40 hover:border-amber-500/70 transition-all duration-200 cursor-pointer">
        {/* Background image */}
        <div className="relative h-44 w-full bg-[#1a1828]">
          {!imgError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={city.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/50 to-transparent" />
        </div>

        {/* Text content */}
        <div className="relative bg-[#1a1828] px-5 pb-5 pt-4 group-hover:bg-[#1e1c2e] transition-colors">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-amber-300">{city.name}</h2>
            <span className="text-amber-700 group-hover:text-amber-400 transition-colors text-xl">→</span>
          </div>
          {city.description && (
            <p className="text-[#a09880] text-sm leading-relaxed">{city.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
