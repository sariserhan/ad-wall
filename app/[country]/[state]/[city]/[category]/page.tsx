import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Country, State } from "country-state-city";
import { parseCountrySlug, parseStateSlug, parseCityFromSlug, parseCategorySlug } from "@/lib/wall-slug-server";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  params: Promise<{ country: string; state: string; city: string; category: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug, state: sSlug, city: citySlug, category: catSlug } = await params;
  const country = parseCountrySlug(cSlug);
  if (!country) return { title: "Wall" };
  const state = parseStateSlug(country, sSlug);
  if (!state) return { title: "Wall" };
  const city = parseCityFromSlug(country, state, citySlug);
  if (!city) return { title: "Wall" };
  const { category } = parseCategorySlug(catSlug);
  if (!category) return { title: "Wall" };
  const stateName = State.getStatesOfCountry(country).find((s) => s.isoCode === state)?.name ?? state;
  const countryName = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;
  const loc = `${city}, ${stateName}`;
  return {
    title: `${category} · ${loc} Wall — Local Ads`,
    description: `Browse ${category} ads in ${loc}, ${countryName}.`,
    alternates: { canonical: `/${cSlug}/${sSlug}/${citySlug}/${catSlug}` },
    openGraph: { title: `${category} in ${loc}`, description: `Local ${category} ads in ${loc}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { country: cSlug, state: sSlug, city: citySlug, category: catSlug } = await params;
  const sp = await searchParams;
  const country = parseCountrySlug(cSlug);
  if (!country) notFound();
  const state = parseStateSlug(country, sSlug);
  if (!state) notFound();
  const city = parseCityFromSlug(country, state, citySlug);
  if (!city) notFound();
  const { category } = parseCategorySlug(catSlug);
  if (!category) notFound();

  const initialCards = await fetchInitialCards({ country, state, city });
  const location = { country, state, city };

  return (
    <WallPageShell
      initialLocation={location}
      initialCategory={category}
      initialCards={initialCards}
      initialCardId={sp.card}
      initialKeyword={sp.keyword}
    />
  );
}
