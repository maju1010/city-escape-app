import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

      <div className="w-full max-w-md flex flex-col gap-5">
        {(cities as City[])?.map((city) => {
          const imgSrc =
            city.image_url ||
            `https://source.unsplash.com/800x400/?${encodeURIComponent(city.name + " city")}`;

          return (
            <Link key={city.id} href={`/city/${city.id}`}>
              <div className="group relative overflow-hidden rounded-xl border border-amber-900/40 hover:border-amber-500/70 transition-all duration-200 cursor-pointer">
                {/* Background image */}
                <div className="relative h-44 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={city.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/60 to-transparent" />
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
        })}
      </div>

      <p className="mt-16 text-[#4a4560] text-xs tracking-widest uppercase">
        Et mordmysterium venter
      </p>
    </main>
  );
}
