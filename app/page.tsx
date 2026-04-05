import { supabase } from "@/lib/supabase";
import CityCard from "./CityCard";
import ComingSoonCard from "./ComingSoonCard";
import ContinueBanner from "./ContinueBanner";

const LOGO_URL =
  "https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images/Logo.png";

const COMING_SOON = [
  {
    id: "coming-kobenhavn",
    name: "København",
    description: "Oplev den danske hovedstad – kanaler, slotte og hemmeligheder",
    image_url:
      "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
    fallback_urls: [
      "https://images.unsplash.com/photo-1548625149-720fb7acd4fc?w=800&q=80",
      "https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=800&q=80",
    ],
  },
  {
    id: "coming-london",
    name: "London",
    description: "Fog, mystery and centuries of secrets await",
    image_url:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
  },
  {
    id: "coming-berlin",
    name: "Berlin",
    description: "Geschichte, Geheimnisse und ein verschwundener Agent",
    image_url:
      "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80",
  },
];

type City = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export default async function HomePage() {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, description, image_url")
    .order("name");

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(240,168,48,0.04) 0%, transparent 60%), #1a1820" }}>
      {/* Logo */}
      <div className="text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="City Escape"
          className="mx-auto mb-4"
          style={{ maxWidth: 300, width: "100%", height: "auto" }}
        />
        <p className="text-[#b8a99a] text-sm tracking-wider uppercase">
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
        <p className="text-[#b8a99a]">Ingen byer fundet.</p>
      )}

      <ContinueBanner />

      <div className="w-full max-w-md flex flex-col gap-5">
        {(cities as City[])?.map((city) => (
          <CityCard key={city.id} city={city} />
        ))}

        {/* Coming soon cities */}
        {COMING_SOON.map((city) => (
          <ComingSoonCard key={city.id} city={city} />
        ))}
      </div>

      <p className="mt-16 text-[#7a6e65] text-xs tracking-widest uppercase">
        Et mordmysterium venter
      </p>
    </main>
  );
}
