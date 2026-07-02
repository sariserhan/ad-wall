import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { AppProviders } from "@/components/app-providers";
import { BugReportLink } from "@/components/bug-report-link";
import { ContactLink } from "@/components/contact-link";
import { PrivacySettingsLink } from "@/components/privacy-settings-link";
import { HomeNav } from "@/features/home/home-nav";
import { TrendingTabs } from "@/features/home/trending-tabs";
import { getClerkPublishableKey } from "@/lib/clerk";
import { fetchIsAdmin } from "@/lib/server-admin";
import { fetchTopWalls, fetchTopCards } from "@/lib/server-cards";

export const metadata: Metadata = {
  title: "Trending — LocalWall",
  description: "Discover what's trending on LocalWall: most visited walls, most liked cards, most reviewed, most contacted and most shared listings near you.",
  openGraph: {
    title: "Trending — LocalWall",
    description: "Most visited walls, liked, reviewed, contacted and shared cards on LocalWall.",
    images: [{ url: "/assets/logo-big.png", width: 1254, height: 1254, alt: "LocalWall" }],
  },
};

export const revalidate = 3600;

export default async function TrendingPage() {
  const { userId, getToken } = await auth();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = getClerkPublishableKey();
  const token = userId ? await getToken({ template: "convex" }) : null;
  const isAdmin = await fetchIsAdmin(token);

  const [walls, liked, reviewed, contacted, shared] = await Promise.all([
    fetchTopWalls(20),
    fetchTopCards("liked", 10),
    fetchTopCards("reviewed", 10),
    fetchTopCards("clicked", 10),
    fetchTopCards("shared", 10),
  ]);

  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey} isAdmin={isAdmin}>
      <HomeNav isSignedIn={Boolean(userId)} showAvatarButton={Boolean(userId)} isAdmin={isAdmin} />
      <main className="trending-page">
        <TrendingTabs
          walls={walls}
          liked={liked}
          reviewed={reviewed}
          contacted={contacted}
          shared={shared}
        />
      </main>
      <footer className="home-footer">
        <div className="home-container home-footer-inner">
          <Link href="/" className="home-footer-brand">LocalWall</Link>
          <nav className="home-footer-links">
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Suspense fallback={null}>
              <BugReportLink />
            </Suspense>
            <PrivacySettingsLink />
            <Suspense fallback={null}>
              <ContactLink />
            </Suspense>
          </nav>
          <p className="home-footer-copy">© {new Date().getFullYear()} LocalWall. All rights reserved.</p>
        </div>
      </footer>
    </AppProviders>
  );
}
