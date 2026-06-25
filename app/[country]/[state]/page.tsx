import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Country, State } from "country-state-city";
import { parseCountrySlug, parseStateSlug, parseCategorySlug } from "@/lib/wall-slug-server";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  params: Promise<{ country: string; state: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug, state: sSlug } = await params;
  const country = parseCountrySlug(cSlug);
  if (!country) return { title: "Wall" };
  const countryName = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;

  const state = parseStateSlug(country, sSlug);
  if (state) {
    const stateName = State.getStatesOfCountry(country).find((s) => s.isoCode === state)?.name ?? state;
    const loc = `${stateName}, ${countryName}`;
    return {
      title: `${loc} Wall — Local Ads`,
      description: `Browse local ads and services in ${loc}.`,
      alternates: { canonical: `/${cSlug}/${sSlug}`, types: { "application/rss+xml": `/${cSlug}/${sSlug}/feed.xml` } },
      openGraph: { title: `${loc} Wall`, description: `Local ads in ${loc}` },
    };
  }

  const { category } = parseCategorySlug(sSlug);
  if (category) {
    return {
      title: `${category} · ${countryName} Wall — Local Ads`,
      description: `Browse ${category} ads in ${countryName}.`,
      alternates: { canonical: `/${cSlug}/${sSlug}` },
      openGraph: { title: `${category} in ${countryName}`, description: `Local ${category} ads in ${countryName}` },
    };
  }

  return { title: "Wall" };
}

export default async function StatePage({ params, searchParams }: Props) {
  const { country: cSlug, state: sSlug } = await params;
  const sp = await searchParams;
  const country = parseCountrySlug(cSlug);
  if (!country) notFound();

  // Segment is a state code → country + state wall
  const state = parseStateSlug(country, sSlug);
  if (state) {
    const initialCards = await fetchInitialCards({ country, state });
    return (
      <WallPageShell
        initialLocation={{ country, state, city: "" }}
        initialCards={initialCards}
        initialCardId={sp.card}
        initialKeyword={sp.keyword}
      />
    );
  }

  // Segment is a category slug → country + category wall (no state/city)
  const { category } = parseCategorySlug(sSlug);
  if (category) {
    const initialCards = await fetchInitialCards({ country });
    return (
      <WallPageShell
        initialLocation={{ country, state: "", city: "" }}
        initialCategory={category}
        initialCards={initialCards}
        initialCardId={sp.card}
        initialKeyword={sp.keyword}
      />
    );
  }

  notFound();
}
