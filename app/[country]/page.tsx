import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Country } from "country-state-city";
import { parseCountrySlug } from "@/lib/wall-slug";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  params: Promise<{ country: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: slug } = await params;
  const country = parseCountrySlug(slug);
  if (!country) return { title: "Wall" };
  const name = Country.getAllCountries().find((c) => c.isoCode === country)?.name ?? country;
  return {
    title: `${name} Wall — Local Ads`,
    description: `Browse local ads and services in ${name}. Connect with businesses near you.`,
    openGraph: { title: `${name} Wall`, description: `Local ads in ${name}` },
  };
}

export default async function CountryPage({ params, searchParams }: Props) {
  const { country: slug } = await params;
  const sp = await searchParams;
  const country = parseCountrySlug(slug);
  if (!country) notFound();

  const initialCards = await fetchInitialCards({ country });
  const location = { country, state: "", city: "" };

  return (
    <WallPageShell
      initialLocation={location}
      initialCards={initialCards}
      initialCardId={sp.card}
      initialKeyword={sp.keyword}
    />
  );
}
