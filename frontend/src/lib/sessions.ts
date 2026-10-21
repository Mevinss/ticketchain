import { afisha } from "./afisha";
import type { Listing } from "./domain";

export const metadataBase =
  "https://ticketchain-ikan.onrender.com/metadata/afisha/";
export const sessionSeeds = afisha.flatMap((item) =>
  item.cities.map((city) => ({
    item,
    city,
    key: `${item.id}-${city === "Астана" ? "astana" : "almaty"}`,
    uri: `${metadataBase}${item.id}-${city === "Астана" ? "astana" : "almaty"}.json`,
  })),
);
export function sessionsFor(itemId: string, events: Listing[], city = "") {
  const uris = sessionSeeds
    .filter((s) => s.item.id === itemId && (!city || s.city === city))
    .map((s) => s.uri);
  return events
    .filter((e) => uris.includes(e.metadataURI))
    .sort((a, b) => Number(a.startsAt - b.startsAt));
}
