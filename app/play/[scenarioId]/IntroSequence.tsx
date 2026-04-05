"use client";

import { useEffect, useRef } from "react";

const LOGO_URL =
  "https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png";

export default function IntroSequence({
  onComplete,
}: {
  missionImageSrc: string | null;
  onComplete: () => void;
}) {
  const calledRef = useRef(false);

  function done() {
    if (calledRef.current) return;
    calledRef.current = true;
    onComplete();
  }

  useEffect(() => {
    try {
      const timer = setTimeout(() => done(), 3000);
      return () => clearTimeout(timer);
    } catch {
      done();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center px-6"
      onClick={done}
    >
      <div
        className="flex flex-col items-center gap-6"
        style={{ animation: "introFadeIn 1s ease-out forwards" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="City Escape"
          style={{ maxWidth: 260, width: "100%", height: "auto" }}
        />
        <p
          className="text-amber-300 font-mono text-lg text-center"
          style={{ animation: "introFadeIn 1s ease-out 0.8s both" }}
        >
          Din mission begynder nu...
        </p>
      </div>

      <button
        onClick={done}
        className="absolute top-4 right-4 text-text-tertiary hover:text-amber-700 text-sm transition-colors px-3 py-2"
      >
        Spring intro over →
      </button>
    </div>
  );
}
