"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type ActiveGame = {
  scenarioId: string;
  scenarioTitle: string;
  currentIndex: number;
  totalTasks: number;
  teamName: string;
};

export const ACTIVE_GAME_KEY = "city-escape-active-game";

export default function ContinueBanner() {
  const [game, setGame] = useState<ActiveGame | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_KEY);
      if (raw) setGame(JSON.parse(raw));
    } catch {
      // Ignore parse errors
    }
  }, []);

  if (!game) return null;

  function handleClear() {
    localStorage.removeItem(ACTIVE_GAME_KEY);
    localStorage.removeItem(`city-escape-start-${game!.scenarioId}`);
    localStorage.removeItem(`city-escape-team-${game!.scenarioId}`);
    setGame(null);
  }

  return (
    <div className="w-full max-w-md mb-6 bg-[#1a1828] border border-amber-700/50 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-700 tracking-widest uppercase mb-1">Igangværende spil</p>
          <p className="text-[#e8e0d0] text-base font-semibold leading-snug">
            {game.teamName} er nået til opgave {game.currentIndex + 1} af {game.totalTasks}
          </p>
          <p className="text-[#a09880] text-sm truncate mt-0.5">{game.scenarioTitle}</p>
        </div>
        <button
          onClick={handleClear}
          className="shrink-0 text-[#4a4560] hover:text-red-500 text-xs underline underline-offset-2 transition-colors mt-1"
        >
          Start forfra
        </button>
      </div>
      <Link
        href={`/play/${game.scenarioId}`}
        className="mt-4 block w-full text-center bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold py-3 rounded-lg transition-colors text-base"
      >
        Fortsæt →
      </Link>
    </div>
  );
}
