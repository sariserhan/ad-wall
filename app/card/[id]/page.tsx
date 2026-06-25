import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppProviders } from "@/components/app-providers";
import { ConnectedWallApp } from "@/features/wall/connected-wall-app";
import { getPublicCard } from "@/server/public-card";
import { Suspense } from "react";

interface CardPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getPublicCard(id);
  if (!card) return { title: "Card not found | WALL" };
  const locationParts = [card.city, card.state].filter(Boolean).join(", ");
  const title = [card.name, card.category, locationParts].filter(Boolean).join(" · ") + " | LocalWall";
  const description = card.message?.slice(0, 160) || card.line.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/card/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CardPage({ params }: CardPageProps) {
  const { id } = await params;
  const card = await getPublicCard(id);
  if (!card) notFound();

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!convexUrl || !clerkPublishableKey) notFound();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const canonicalUrl = `${appUrl}/card/${id}`;
  const locationParts = [card.area, card.city, card.state, card.country].filter(Boolean).join(", ");

  const sameAs = [
    card.website,
    card.instagram ? `https://instagram.com/${card.instagram.replace(/^@/, "")}` : null,
    card.facebook,
    card.linkedin,
    card.tiktok ? `https://tiktok.com/@${card.tiktok.replace(/^@/, "")}` : null,
  ].filter(Boolean) as string[];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: card.name,
    description: card.message || card.line || undefined,
    url: card.website || canonicalUrl,
    ...(card.phone ? { telephone: card.phone } : {}),
    ...(card.email ? { email: card.email } : {}),
    ...(card.images[0] ? { image: card.images[0] } : {}),
    ...(card.price ? { priceRange: card.price } : {}),
    ...(locationParts ? { areaServed: locationParts } : {}),
    ...(card.city || card.state || card.country || card.zipcode ? {
      address: {
        "@type": "PostalAddress",
        ...(card.area ? { streetAddress: card.area } : {}),
        ...(card.city ? { addressLocality: card.city } : {}),
        ...(card.state ? { addressRegion: card.state } : {}),
        ...(card.country ? { addressCountry: card.country } : {}),
        ...(card.zipcode ? { postalCode: card.zipcode } : {}),
      },
    } : {}),
    ...(card.reviewCount > 0 && card.avgRating > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: card.avgRating,
        reviewCount: card.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  const jsonLdString = JSON.stringify(jsonLd).replace(/<\//g, "<\\/");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
        <Suspense fallback={<div className="app-loading"><strong>WALL</strong><span>Loading {card.name}…</span></div>}>
          <ConnectedWallApp initialCardId={id} />
        </Suspense>
      </AppProviders>
    </>
  );
}
