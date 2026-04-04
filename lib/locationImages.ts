/** Billeder til kendte lokationer og byer — Picsum bruges som pålidelig kilde */

// Picsum IDs: https://picsum.photos/id/[ID]/800/400
// Hvert ID giver et fast, smukt fotografi

export const CITY_IMAGES: Record<string, string> = {
  // Aarhus: bybillede med flod/arkitektur
  aarhus: "https://picsum.photos/id/1040/800/400",
};

export const LOCATION_IMAGES: Record<string, string> = {
  // Aarhus Rådhus: klassisk bygning
  "aarhus rådhus":       "https://picsum.photos/id/164/800/400",
  // Aarhus Domkirke: kirke/historisk
  "aarhus domkirke":     "https://picsum.photos/id/218/800/400",
  // Aarhus Å: å/vand/natur
  "aarhus å":            "https://picsum.photos/id/15/800/400",
  // Mejlgade / Latinske Kvarter: gadekultur
  "mejlgade / latinske kvarter": "https://picsum.photos/id/429/800/400",
  "mejlgade":            "https://picsum.photos/id/429/800/400",
  "latinske kvarter":    "https://picsum.photos/id/429/800/400",
  // Den Gamle By: historisk miljø
  "den gamle by":        "https://picsum.photos/id/392/800/400",
  // Clemens Torv: byplads
  "clemens torv":        "https://picsum.photos/id/401/800/400",
  // Aarhus Teater: teater/kultur
  "aarhus teater":       "https://picsum.photos/id/158/800/400",
  // Mølleparken: park/natur
  "mølleparken":         "https://picsum.photos/id/28/800/400",
};

export function getCityImage(name: string, imageUrl: string | null): string {
  if (imageUrl) return imageUrl;
  return (
    CITY_IMAGES[name.toLowerCase().trim()] ||
    `https://picsum.photos/seed/${encodeURIComponent(name)}/800/400`
  );
}

export function getLocationImage(locationName: string, imageUrl: string | null): string {
  if (imageUrl) return imageUrl;
  return (
    LOCATION_IMAGES[locationName.toLowerCase().trim()] ||
    `https://picsum.photos/seed/${encodeURIComponent(locationName)}/800/400`
  );
}
