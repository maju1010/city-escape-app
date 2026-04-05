"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getCityImage } from "@/lib/locationImages";

type City = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export default function CityCard({ city }: { city: City }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = getCityImage(city.name, city.image_url);
  const shouldReduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    if (shouldReduce) return;
    function onScroll() {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const viewH = window.innerHeight;
      // Progress: 0 when bottom enters viewport, 1 when top leaves
      const progress = 1 - (rect.bottom / (viewH + rect.height));
      setParallaxY(progress * 28); // max 28px shift
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [shouldReduce]);

  return (
    <Link href={`/city/${city.id}`}>
      <motion.div
        ref={cardRef}
        className="group relative overflow-hidden rounded-xl border border-amber-900/40 hover:border-amber-500/70 transition-colors duration-200 cursor-pointer"
        whileHover={shouldReduce ? undefined : { scale: 1.015 }}
        transition={{ duration: 0.2 }}
      >
        {/* Background image with parallax */}
        <div className="relative h-44 w-full bg-[#1a1828] overflow-hidden">
          {!imgError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={city.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: `translateY(${parallaxY}px) scale(1.12)`,
                transformOrigin: "center center",
              }}
              onError={() => setImgError(true)}
            />
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/50 to-transparent" />

          {/* "Tilgængeligt nu" badge */}
          <div className="absolute top-3 right-3">
            <span className="bg-green-900/80 border border-green-700/60 text-green-300 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
              Tilgængeligt nu
            </span>
          </div>
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
      </motion.div>
    </Link>
  );
}
