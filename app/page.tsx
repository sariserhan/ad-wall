import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { fetchIsAdmin } from "@/lib/server-admin";
import { toCitySlug, toCategorySlug } from "@/lib/wall-slug";
import { AppProviders } from "@/components/app-providers";
import { HomePage } from "@/features/home/home-page";
import { getClerkPublishableKey } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "LocalWall — Your local community board",
  description:
    "Post and browse local ads for services, jobs, real estate, pets, and more in your city. Free listings, affordable upgrades.",
  openGraph: {
    title: "LocalWall — Your local community board",
    description: "Post and browse local ads in your city.",
    images: [{ url: "/assets/logo-big.png", width: 1254, height: 1254, alt: "LocalWall" }],
  },
  twitter: {
    card: "summary",
    title: "LocalWall — Your local community board",
    description: "Post and browse local ads in your city.",
    images: ["/assets/logo-big.png"],
  },
};

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function RootPage({ searchParams }: Props) {
  const params = await searchParams;
  const { userId, getToken } = await auth();

  // Redirect legacy ?country= URLs to path-based routes
  if (params.country) {
    const parts: string[] = [params.country.toLowerCase()];
    if (params.state) parts.push(params.state.toLowerCase());
    if (params.city) parts.push(toCitySlug(params.city));
    if (params.category && params.category !== "All") parts.push(toCategorySlug(params.category));
    const qs = new URLSearchParams();
    if (params.subcategory) qs.set("subcategory", params.subcategory);
    if (params.keyword) qs.set("keyword", params.keyword);
    if (params.card) qs.set("card", params.card);
    if (params.neighborhood) qs.set("neighborhood", params.neighborhood);
    const qStr = qs.toString();
    redirect(`/${parts.join("/")}${qStr ? `?${qStr}` : ""}`);
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = getClerkPublishableKey();
  const token = userId ? await getToken({ template: "convex" }) : null;
  const isAdmin = await fetchIsAdmin(token);
  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
      <HomePage isSignedIn={Boolean(userId)} isAdmin={isAdmin} />
    </AppProviders>
  );
}
