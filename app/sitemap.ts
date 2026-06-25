import type { MetadataRoute } from "next";
import { categories } from "@/features/wall/types";
import { toCategorySlug } from "@/lib/wall-slug";
import { fetchPublishedCardIds } from "@/lib/server-cards";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://localwall.app";

const CITY_PATHS = [
  "/us/ny/new-york",
  "/us/ny/brooklyn",
  "/us/pa/philadelphia",
  "/us/ma/boston",
  "/us/dc/washington",
  "/us/fl/miami",
  "/us/ga/atlanta",
  "/us/nc/charlotte",
  "/us/il/chicago",
  "/us/tx/houston",
  "/us/tx/dallas",
  "/us/tx/austin",
  "/us/az/phoenix",
  "/us/tx/san-antonio",
  "/us/nv/las-vegas",
  "/us/co/denver",
  "/us/ca/los-angeles",
  "/us/ca/san-francisco",
  "/us/wa/seattle",
  "/us/or/portland",
  "/us/oh/columbus",
  "/us/tn/nashville",
  "/us/mn/minneapolis",
  "/us/mo/kansas-city",
  "/us/wi/milwaukee",
  "/us/fl/orlando",
  "/us/fl/tampa",
  "/us/ca/san-diego",
  "/us/ca/sacramento",
  "/us/nv/henderson",
];

const STATIC_ROUTES = [
  { url: "/",                    priority: 1.0, changeFrequency: "daily"  as const },
  { url: "/trending",            priority: 0.8, changeFrequency: "daily"  as const },
  { url: "/terms-and-conditions",priority: 0.3, changeFrequency: "yearly" as const },
  { url: "/privacy-policy",      priority: 0.3, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ url, priority, changeFrequency }) => ({
    url: `${BASE_URL}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const cityEntries: MetadataRoute.Sitemap = CITY_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  const nonAllCategories = categories.filter((c) => c !== "All");
  const categoryEntries: MetadataRoute.Sitemap = CITY_PATHS.flatMap((cityPath) =>
    nonAllCategories.map((cat) => ({
      url: `${BASE_URL}${cityPath}/${toCategorySlug(cat)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  );

  const cardIds = await fetchPublishedCardIds();
  const cardEntries: MetadataRoute.Sitemap = cardIds.map(({ id, updatedAt }) => ({
    url: `${BASE_URL}/card/${id}`,
    lastModified: new Date(updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...cityEntries, ...categoryEntries, ...cardEntries];
}
