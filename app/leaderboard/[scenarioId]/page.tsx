import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

type Entry = {
  id: string;
  team_name: string;
  completion_time_seconds: number;
  hints_used: number;
  created_at: string;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
}

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "text-amber-400",   // 1st – gold
  "text-slate-300",   // 2nd – silver
  "text-amber-700",   // 3rd – bronze
];

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;

  const [{ data: scenario }, { data: entries }] = await Promise.all([
    supabase
      .from("scenarios")
      .select("id, title")
      .eq("id", scenarioId)
      .single(),
    supabase
      .from("leaderboard")
      .select("id, team_name, completion_time_seconds, hints_used, created_at")
      .eq("scenario_id", scenarioId)
      .order("completion_time_seconds", { ascending: true })
      .limit(10),
  ]);

  if (!scenario) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Back */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="text-amber-700 hover:text-amber-400 text-sm tracking-wider transition-colors"
        >
          ← Tilbage til forsiden
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-md text-center mb-10">
        <div className="text-4xl mb-3">🏆</div>
        <h1 className="text-2xl font-bold text-amber-400 mb-1">Leaderboard</h1>
        <p className="text-[#a09880] text-sm">{scenario.title}</p>
        <div className="mt-4 w-12 h-px bg-amber-800 mx-auto" />
      </div>

      {/* Table */}
      <div className="w-full max-w-md">
        {(!entries || entries.length === 0) ? (
          <div className="bg-[#1a1828] border border-amber-900/30 rounded-xl p-8 text-center">
            <p className="text-[#6b6380] text-sm">Ingen resultater endnu.</p>
            <p className="text-[#4a4560] text-xs mt-1">Vær det første hold til at gennemføre!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(entries as Entry[]).map((entry, i) => {
              const isTop3 = i < 3;
              const rankColor = RANK_COLORS[i] ?? "text-[#6b6380]";
              return (
                <div
                  key={entry.id}
                  className={`bg-[#1a1828] border rounded-xl px-4 py-4 flex items-center gap-4 ${
                    i === 0
                      ? "border-amber-600/60"
                      : i === 1
                      ? "border-slate-600/40"
                      : i === 2
                      ? "border-amber-900/60"
                      : "border-amber-900/20"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {isTop3 ? (
                      <span className="text-xl">{MEDALS[i]}</span>
                    ) : (
                      <span className={`text-sm font-bold ${rankColor}`}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Team name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-base truncate ${isTop3 ? rankColor : "text-[#e8e0d0]"}`}>
                      {entry.team_name}
                    </p>
                    <p className="text-[#6b6380] text-xs mt-0.5">
                      {formatDate(entry.created_at)}
                      {entry.hints_used > 0 && ` · ${entry.hints_used} hint${entry.hints_used !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {/* Time */}
                  <div className={`font-mono font-bold text-lg tabular-nums shrink-0 ${isTop3 ? rankColor : "text-amber-700"}`}>
                    {formatTime(entry.completion_time_seconds)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
