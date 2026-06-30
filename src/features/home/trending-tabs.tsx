"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Star, MousePointerClick, Share2, TrendingUp } from "lucide-react";
import { parseWallPath } from "@/lib/wall-slug";
import { TrendingCardGrid } from "./trending-card-grid";
import { TrendingCardModal } from "./trending-card-modal";
import { wallCardStyle } from "./trending-wall-style";
import type { TopCard } from "@/lib/server-cards";

type TopWall = { path: string; viewCount: number };
type Tab = "walls" | "liked" | "reviewed" | "contacted" | "shared";

const TABS: { id: Tab; label: string; Icon: React.ElementType; metric: string; desc: string; empty: string }[] = [
  { id: "walls",     label: "Trending Walls",  Icon: TrendingUp,        metric: "views",    desc: "Most visited local boards, ranked by all-time views.",           empty: "No wall visits recorded yet." },
  { id: "liked",     label: "Most Liked",       Icon: Heart,             metric: "likes",    desc: "Cards that locals love most, ranked by total likes.",            empty: "No likes yet — be the first to like a card." },
  { id: "reviewed",  label: "Most Reviewed",    Icon: Star,              metric: "reviews",  desc: "The most reviewed cards across all walls.",                      empty: "No reviews yet." },
  { id: "contacted", label: "Most Contacted",   Icon: MousePointerClick, metric: "contacts", desc: "Cards people reach out through most — calls, emails, websites.", empty: "No contacts recorded yet." },
  { id: "shared",    label: "Most Shared",      Icon: Share2,            metric: "shares",   desc: "Cards shared most via link, WhatsApp, or QR code.",              empty: "No shares yet — share a card to get it on the board." },
];

interface Props {
  walls: TopWall[];
  liked: TopCard[];
  reviewed: TopCard[];
  contacted: TopCard[];
  shared: TopCard[];
}

export function TrendingTabs({ walls, liked, reviewed, contacted, shared }: Props) {
  const [active, setActive] = useState<Tab>("walls");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.id === hash)) setActive(hash);
  }, []);

  const switchTab = (tab: Tab) => {
    setActive(tab);
    setSelectedCardId(null);
    window.history.replaceState(null, "", `#${tab}`);
  };

  const currentTab = TABS.find((t) => t.id === active)!;
  const cardData = active === "liked" ? liked : active === "reviewed" ? reviewed : active === "contacted" ? contacted : shared;

  return (
    <>
      {/* Sticky topbar */}
      <div className="trending-topbar">
        <div className="home-container">
          <div className="trending-topbar-row">
            <h1 className="trending-title">Trending</h1>
            <nav className="trending-tabs">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`trending-tab${active === id ? " active" : ""}`}
                  onClick={() => switchTab(id)}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <p className="trending-tab-desc">{currentTab.desc}</p>
        </div>
      </div>

      {/* Full-screen content — both tabs share the wall background */}
      <div className="trending-wall-view">
        {active === "walls" ? (
          walls.length === 0 ? (
            <p className="trending-empty">No wall visits recorded yet.</p>
          ) : (
            <div className="trending-walls-grid">
              {walls.map((wall, i) => {
                const { city, state, country } = parseWallPath(wall.path);
                return (
                  <Link key={wall.path} href={wall.path} className="trending-wall-card" style={wallCardStyle(wall.path)}>
                    <div className="twc-top">
                      <span className="twc-rank">#{i + 1}</span>
                      <span className="twc-views">{wall.viewCount.toLocaleString()} <em>views</em></span>
                    </div>
                    <strong className="twc-city">{city || state || country}</strong>
                    <span className="twc-state">{state && city ? `${state} · ${country}` : country}</span>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <TrendingCardGrid
            cards={cardData}
            metric={currentTab.metric}
            empty={currentTab.empty}
            onSelect={setSelectedCardId}
          />
        )}
      </div>

      {selectedCardId && (
        <TrendingCardModal cardId={selectedCardId} onClose={() => setSelectedCardId(null)} />
      )}
    </>
  );
}
