import { supabase } from "@/lib/supabase";
import CityCard from "./CityCard";
import ContinueBanner from "./ContinueBanner";

type City = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
};

export default async function HomePage() {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, description, image_url")
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

      {error && (
        <p className="text-red-400 text-sm">
          Kunne ikke hente byer: {error.message}
        </p>
      )}

      {!error && cities && cities.length === 0 && (
        <p className="text-[#a09880]">Ingen byer fundet.</p>
      )}

      <ContinueBanner />

      <div className="w-full max-w-md flex flex-col gap-5">
        {(cities as City[])?.map((city) => (
          <CityCard key={city.id} city={city} />
        ))}
      </div>

      <p className="mt-16 text-[#4a4560] text-xs tracking-widest uppercase">
        Et mordmysterium venter
      </p>
    </main>
  );
}
