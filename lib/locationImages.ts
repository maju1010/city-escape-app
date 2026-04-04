const SUPABASE_STORAGE = 'https://paitcrtbdcvujhpfpbhw.supabase.co/storage/v1/object/public/images';

export const CITY_IMAGES: Record<string, string> = {
  'aarhus': `${SUPABASE_STORAGE}/Aarhus.jpg`,
};

export const LOCATION_IMAGES: Record<string, string> = {
  'aarhus rådhus':           `${SUPABASE_STORAGE}/Aarhus_Radhus.jpg`,
  'aarhus domkirke':         `${SUPABASE_STORAGE}/AarhusDomkirke.jpg`,
  'aarhus å / åboulevarden': `${SUPABASE_STORAGE}/aarhusAA.jpg`,
  'mejlgade':                `${SUPABASE_STORAGE}/Mejlgade.jpg`,
  'den gamle by':            `${SUPABASE_STORAGE}/DenGamleBy.jpg`,
  'clemens torv':            `${SUPABASE_STORAGE}/Clemenstorv.jpg`,
  'aarhus teater':           `${SUPABASE_STORAGE}/Aarhus-Teater-set-ude-fra-Bispetorv.webp`,
  'mølleparken':             `${SUPABASE_STORAGE}/Moelleparken_7835.webp`,
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
