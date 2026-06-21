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
  const title = `CARD-${card.name}`;
  const description = card.message?.slice(0, 160) || card.line.slice(0, 160);
  const image = card.images[0];
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image, alt: card.name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
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

  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
      <Suspense fallback={<div className="app-loading"><strong>WALL</strong><span>Loading {card.name}…</span></div>}>
        <ConnectedWallApp initialCardId={id} />
      </Suspense>
    </AppProviders>
  );
}
