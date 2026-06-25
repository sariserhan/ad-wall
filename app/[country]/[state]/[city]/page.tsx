import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Country, State } from "country-state-city";
import { parseCountrySlug, parseStateSlug, parseCityFromSlug, parseCategorySlug } from "@/lib/wall-slug-server";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  params: Promise<{ country: string; state: string; city: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug, state: sSlug, city: citySlug } = await params;
  const country = parseCountrySlug(cSlug);
  if (!country) return { title: "Wall" };
  const state = parseStateSlug(country, sSlug);
  if (!state) return { title: "Wall" };
  const countryName = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;
  const stateName = State.getStatesOfCountry(country).find((s) => s.isoCode === state)?.name ?? state;

  const city = parseCityFromSlug(country, state, citySlug);
  if (city) {
    const loc = `${city}, ${stateName}`;
    return {
      title: `${loc} Local Bulletin Board — Services, Jobs & Events | LocalWall`,
      description: `Browse local ads in ${loc}. Find services, repairs, jobs, events, real estate and more on the ${loc} community wall. Free to browse, easy to post.`,
      alternates: { canonical: `/${cSlug}/${sSlug}/${citySlug}`, types: { "application/rss+xml": `/${cSlug}/${sSlug}/${citySlug}/feed.xml` } },
      openGraph: { title: `${loc} Local Bulletin Board`, description: `Local ads, services and events in ${loc}, ${countryName}.` },
    };
  }

  const { category } = parseCategorySlug(citySlug);
  if (category) {
    const loc = `${stateName}, ${countryName}`;
    return {
      title: `${category} · ${loc} Wall — Local Ads`,
      description: `Browse ${category} ads in ${loc}.`,
      alternates: { canonical: `/${cSlug}/${sSlug}/${citySlug}` },
      openGraph: { title: `${category} in ${loc}`, description: `Local ${category} ads in ${loc}` },
    };
  }

  return { title: "Wall" };
}

export default async function CityPage({ params, searchParams }: Props) {
  const { country: cSlug, state: sSlug, city: citySlug } = await params;
  const sp = await searchParams;
  const country = parseCountrySlug(cSlug);
  if (!country) notFound();
  const state = parseStateSlug(country, sSlug);
  if (!state) notFound();

  // Segment is a city name → country + state + city wall
  const city = parseCityFromSlug(country, state, citySlug);
  if (city) {
    const initialCards = await fetchInitialCards({ country, state, city });
    const countryName = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;
    const stateName = State.getStatesOfCountry(country).find((s) => s.isoCode === state)?.name ?? state;
    const h1 = `${city}, ${stateName} local bulletin board — browse ${initialCards.length > 0 ? `${initialCards.length}+` : ""} ads for services, jobs, events and more in ${countryName}.`;
    return (
      <>
        <h1 className="sr-only">{h1}</h1>
        <WallPageShell
          initialLocation={{ country, state, city }}
          initialCards={initialCards}
          initialCardId={sp.card}
          initialKeyword={sp.keyword}
        />
      </>
    );
  }

  // Segment is a category slug → country + state + category wall (no city)
  const { category } = parseCategorySlug(citySlug);
  if (category) {
    const initialCards = await fetchInitialCards({ country, state });
    return (
      <WallPageShell
        initialLocation={{ country, state, city: "" }}
        initialCategory={category}
        initialCards={initialCards}
        initialCardId={sp.card}
        initialKeyword={sp.keyword}
      />
    );
  }

  notFound();
}
