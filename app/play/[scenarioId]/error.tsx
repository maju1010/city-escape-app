"use client";

export default function GameError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl mb-4">⚠️</p>
      <h1 className="text-xl font-bold text-amber-400 mb-2">Noget gik galt</h1>
      <p className="text-text-secondary text-base mb-6 max-w-sm">{error.message}</p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-bg-primary font-semibold transition-colors"
      >
        Prøv igen
      </button>
    </div>
  );
}
