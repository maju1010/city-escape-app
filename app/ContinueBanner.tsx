"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_KEY);
      if (raw) setGame(JSON.parse(raw));
    } catch {
      // Ignore parse errors
    }
  }, []);

  if (!game) return null;

  function handleStartOver() {
    // Clear all session data for this scenario
    localStorage.removeItem(ACTIVE_GAME_KEY);
    localStorage.removeItem(`city-escape-start-${game!.scenarioId}`);
    localStorage.removeItem(`city-escape-team-${game!.scenarioId}`);
    setGame(null);
    // Navigate to play page — team name screen shows since data is cleared
    router.push(`/play/${game!.scenarioId}`);
  }

  return (
    <div className="w-full max-w-md mb-6 bg-bg-secondary border border-amber-700/50 rounded-xl px-5 py-5">
      <p className="text-xs text-amber-700 tracking-widest uppercase mb-1">Igangværende spil</p>
      <p className="text-text-primary text-base font-semibold leading-snug">
        {game.teamName} er nået til opgave {game.currentIndex + 1} af {game.totalTasks}
      </p>
      <p className="text-text-secondary text-sm mt-0.5 mb-5">{game.scenarioTitle}</p>

      {/* Primary: Fortsæt */}
      <Link
        href={`/play/${game.scenarioId}`}
        className="block w-full text-center bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold py-3 rounded-lg transition-colors text-base mb-3"
      >
        Fortsæt → (opgave {game.currentIndex + 1})
      </Link>

      {/* Secondary: Start forfra */}
      <button
        onClick={handleStartOver}
        className="w-full text-center border border-amber-900/50 hover:border-amber-700 text-amber-800 hover:text-amber-600 font-semibold py-3 rounded-lg transition-colors text-base"
      >
        Start forfra
      </button>
    </div>
  );
}
