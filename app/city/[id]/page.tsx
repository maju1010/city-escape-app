import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

type Scenario = {
  id: string;
  title: string;
  intro: string;
  duration_minutes: number;
};

type City = {
  id: string;
  name: string;
  description: string;
};

export default async function CityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: city }, { data: scenarios }] = await Promise.all([
    supabase.from("cities").select("id, name, description").eq("id", id).single(),
    supabase
      .from("scenarios")
      .select("id, title, intro, duration_minutes")
      .eq("city_id", id)
      .order("title"),
  ]);

  if (!city) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Back */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="text-amber-700 hover:text-amber-400 text-sm tracking-wider transition-colors"
        >
          ← Tilbage
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-md mb-10">
        <h1 className="text-3xl font-bold text-amber-400 mb-3">{(city as City).name}</h1>
        {(city as City).description && (
          <p className="text-[#a09880] text-sm leading-relaxed">{(city as City).description}</p>
        )}
        <div className="mt-5 w-12 h-px bg-amber-800" />
      </div>

      {/* Scenarios */}
      <div className="w-full max-w-md">
        <h2 className="text-xs tracking-widest uppercase text-[#6b6380] mb-4">
          Tilgængelige scenarier
        </h2>

        {scenarios && scenarios.length === 0 && (
          <p className="text-[#a09880] text-sm">Ingen scenarier fundet for denne by.</p>
        )}

        <div className="flex flex-col gap-5">
          {(scenarios as Scenario[])?.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-[#1a1828] border border-amber-900/40 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-amber-300 leading-tight">
                  {scenario.title}
                </h3>
                {scenario.duration_minutes && (
                  <span className="shrink-0 text-xs text-amber-700 border border-amber-900/60 rounded-full px-2 py-0.5 mt-0.5">
                    {scenario.duration_minutes} min
                  </span>
                )}
              </div>

              {scenario.intro && (
                <p className="text-[#a09880] text-base leading-relaxed mb-5">
                  {scenario.intro}
                </p>
              )}

              <Link
                href={`/play/${scenario.id}`}
                className="block w-full text-center bg-amber-600 hover:bg-amber-500 text-[#0f0e17] font-semibold text-base py-3 rounded-lg transition-colors"
              >
                Start spillet
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
