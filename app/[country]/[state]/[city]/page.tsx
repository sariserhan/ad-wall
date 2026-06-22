import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Country, State } from "country-state-city";
import { parseCountrySlug, parseStateSlug, parseCityFromSlug } from "@/lib/wall-slug";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  params: Promise<{ country: string; state: string; city: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug, state: sSlug, city: citySlug } = await params;
  const country = parseCountrySlug(cSlug);
  if (!country) return { title: "Wall" };
  const state = parseStateSlug(country, sSlug);
  if (!state) return { title: "Wall" };
  const city = parseCityFromSlug(country, state, citySlug);
  if (!city) return { title: "Wall" };
  const stateName = State.getStatesOfCountry(country).find((s) => s.isoCode === state)?.name ?? state;
  const countryName = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;
  const loc = `${city}, ${stateName}`;
  return {
    title: `${loc} Wall — Local Ads`,
    description: `Browse local ads and services in ${loc}, ${countryName}. Find plumbers, restaurants, tutors and more.`,
    openGraph: { title: `${loc} Wall`, description: `Local ads in ${loc}` },
  };
}

export default async function CityPage({ params, searchParams }: Props) {
  const { country: cSlug, state: sSlug, city: citySlug } = await params;
  const sp = await searchParams;
  const country = parseCountrySlug(cSlug);
  if (!country) notFound();
  const state = parseStateSlug(country, sSlug);
  if (!state) notFound();
  const city = parseCityFromSlug(country, state, citySlug);
  if (!city) notFound();

  const initialCards = await fetchInitialCards({ country, state, city });
  const location = { country, state, city };

  return (
    <WallPageShell
      initialLocation={location}
      initialCards={initialCards}
      initialCardId={sp.card}
      initialKeyword={sp.keyword}
    />
  );
}
