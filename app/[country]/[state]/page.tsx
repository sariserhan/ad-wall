import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Country, State } from "country-state-city";
import { parseCountrySlug, parseStateSlug } from "@/lib/wall-slug";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  params: Promise<{ country: string; state: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug, state: sSlug } = await params;
  const country = parseCountrySlug(cSlug);
  if (!country) return { title: "Wall" };
  const state = parseStateSlug(country, sSlug);
  if (!state) return { title: "Wall" };
  const countryName = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;
  const stateName = State.getStatesOfCountry(country).find((s) => s.isoCode === state)?.name ?? state;
  const loc = `${stateName}, ${countryName}`;
  return {
    title: `${loc} Wall — Local Ads`,
    description: `Browse local ads and services in ${loc}.`,
    openGraph: { title: `${loc} Wall`, description: `Local ads in ${loc}` },
  };
}

export default async function StatePage({ params, searchParams }: Props) {
  const { country: cSlug, state: sSlug } = await params;
  const sp = await searchParams;
  const country = parseCountrySlug(cSlug);
  if (!country) notFound();
  const state = parseStateSlug(country, sSlug);
  if (!state) notFound();

  const initialCards = await fetchInitialCards({ country, state });
  const location = { country, state, city: "" };

  return (
    <WallPageShell
      initialLocation={location}
      initialCards={initialCards}
      initialCardId={sp.card}
      initialKeyword={sp.keyword}
    />
  );
}
