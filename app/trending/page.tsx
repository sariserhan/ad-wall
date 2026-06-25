import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { AppProviders } from "@/components/app-providers";
import { HomeNav } from "@/features/home/home-nav";
import { fetchTopWalls } from "@/lib/server-cards";
import { formatWallPath } from "@/lib/wall-slug";

export const metadata: Metadata = {
  title: "Trending Walls — LocalWall",
  description: "The most visited local community boards on LocalWall. Discover active neighborhoods, browse cards, and find what's happening near you.",
  openGraph: {
    title: "Trending Walls — LocalWall",
    description: "The most visited local community boards on LocalWall.",
    images: [{ url: "/assets/logo-big.png", width: 1254, height: 1254, alt: "LocalWall" }],
  },
};

export const revalidate = 3600;

export default async function TrendingPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const walls = await fetchTopWalls(50);

  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
      <HomeNav />
      <main className="trending-page">
        <div className="home-container">
          <div className="trending-paper">
            <header className="trending-header">
              <h1 className="trending-title">Trending walls</h1>
              <p className="trending-sub">Most visited local boards, ranked by all-time views.</p>
            </header>

            {walls.length === 0 ? (
              <p className="trending-empty">No data yet — check back soon.</p>
            ) : (
              <ol className="trending-list">
                {walls.map((wall, i) => (
                  <li key={wall.path} className="trending-item">
                    <span className="trending-rank">{i + 1}</span>
                    <Link href={wall.path} className="trending-link">
                      <MapPin size={13} className="trending-pin" />
                      {formatWallPath(wall.path)}
                    </Link>
                    <span className="trending-views">{wall.viewCount.toLocaleString()} <span>views</span></span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </main>
      <footer className="home-footer">
        <div className="home-container home-footer-inner">
          <Link href="/" className="home-footer-brand">LocalWall</Link>
          <nav className="home-footer-links">
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </nav>
          <p className="home-footer-copy">© {new Date().getFullYear()} LocalWall. All rights reserved.</p>
        </div>
      </footer>
    </AppProviders>
  );
}
