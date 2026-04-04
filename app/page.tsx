import Link from "next/link";
import { supabase } from "@/lib/supabase";

type City = {
  id: string;
  name: string;
  description: string;
};

export default async function HomePage() {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, description")
    .order("name");

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-widest text-amber-400 uppercase mb-2">
          City Escape
        </h1>
        <p className="text-[#a09880] text-sm tracking-wider uppercase">
          Vælg din destination
        </p>
        <div className="mt-4 w-16 h-px bg-amber-600 mx-auto" />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">
          Kunne ikke hente byer: {error.message}
        </p>
      )}

      {/* Empty state */}
      {!error && cities && cities.length === 0 && (
        <p className="text-[#a09880]">Ingen byer fundet.</p>
      )}

      {/* City cards */}
      <div className="w-full max-w-md flex flex-col gap-4">
        {cities?.map((city: City) => (
          <Link key={city.id} href={`/city/${city.id}`}>
            <div className="group relative bg-[#1a1828] border border-amber-900/40 rounded-xl p-6 hover:border-amber-500/70 hover:bg-[#1e1c2e] transition-all duration-200 cursor-pointer">
              <div className="absolute top-4 right-5 text-amber-700 group-hover:text-amber-400 transition-colors text-xl">
                →
              </div>
              <h2 className="text-xl font-semibold text-amber-300 mb-2">
                {city.name}
              </h2>
              {city.description && (
                <p className="text-[#a09880] text-sm leading-relaxed line-clamp-2">
                  {city.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-16 text-[#4a4560] text-xs tracking-widest uppercase">
        Et mordmysterium venter
      </p>
    </main>
  );
}
