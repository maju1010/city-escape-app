/** Hardkodede Unsplash-billeder til kendte lokationer og byer */

export const CITY_IMAGES: Record<string, string> = {
  aarhus: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
};

export const LOCATION_IMAGES: Record<string, string> = {
  "aarhus rådhus":
    "https://images.unsplash.com/photo-1588013273468-3c64e3e5f5e3?w=800&q=80",
  "aarhus domkirke":
    "https://images.unsplash.com/photo-1548625149-720fb7acd4fc?w=800&q=80",
  "aarhus å":
    "https://images.unsplash.com/photo-1571406252241-db0280bd36cd?w=800&q=80",
  "mejlgade / latinske kvarter":
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  "mejlgade":
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  "latinske kvarter":
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  "den gamle by":
    "https://images.unsplash.com/photo-1548625149-720fb7acd4fc?w=800&q=80",
  "clemens torv":
    "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
  "aarhus teater":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
  "mølleparken":
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
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
