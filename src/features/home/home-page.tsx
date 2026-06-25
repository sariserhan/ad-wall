import Link from "next/link";
import {
  Baby,
  BarChart2,
  Briefcase,
  Building2,
  Car,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Hammer,
  Heart,
  HeartHandshake,
  Home,
  Laptop,
  MapPin,
  PawPrint,
  PartyPopper,
  PenLine,
  Scissors,
  Share2,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeNav } from "./home-nav";
import { HomeSearch } from "./home-search";
import { fetchInitialCards, fetchTopWalls } from "@/lib/server-cards";
import { categories } from "@/features/wall/types";
import { toCategorySlug, formatWallPath } from "@/lib/wall-slug";
import type { WallCard } from "@/features/wall/types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Services": Wrench,
  "Repairs": Hammer,
  "Jobs": ClipboardList,
  "Real Estate": Building2,
  "Buy & Sell Marketplace": Tag,
  "Food & Catering": UtensilsCrossed,
  "Health & Fitness": Heart,
  "Shops & Retail": ShoppingBag,
  "Home & Garden": Home,
  "Events & Entertainment": PartyPopper,
  "Pets": PawPrint,
  "Classes & Education": GraduationCap,
  "Automotive": Car,
  "Beauty & Personal Care": Scissors,
  "Professional Services": Briefcase,
  "Technology": Laptop,
  "Child & Family": Baby,
  "Community": Users,
  "Dating": HeartHandshake,
  "Vehicles": Truck,
};


const HOW_IT_WORKS = [
  {
    num: 1,
    Icon: MapPin,
    title: "Choose your city",
    desc: "Browse your local wall or search for any city or neighborhood.",
  },
  {
    num: 2,
    Icon: PenLine,
    title: "Create your ad",
    desc: "Fill in your details, pick a card style, and choose how long your listing stays live.",
  },
  {
    num: 3,
    Icon: Share2,
    title: "Share your listing",
    desc: "Every card gets its own link — share on social, WhatsApp, or anywhere in seconds.",
  },
  {
    num: 4,
    Icon: Zap,
    title: "Get discovered locally",
    desc: "People in your city find your ad on the wall and reach out directly to you.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I got my first client 2 days after posting. Way better than handing out flyers.",
    name: "Maria S.",
    role: "House Cleaner",
    location: "Miami, FL",
  },
  {
    quote: "Finally an ad board that shows up when people search locally. Got 4 new jobs last month.",
    name: "David K.",
    role: "Handyman",
    location: "Chicago, IL",
  },
  {
    quote: "I love how clean my card looks. Parents trust it way more than a Craigslist post.",
    name: "Priya L.",
    role: "Tutor",
    location: "Houston, TX",
  },
];

const WHY_ITEMS = [
  {
    Icon: MapPin,
    title: "Hyperlocal reach",
    body: "Pin your ad to the exact city or neighborhood — get seen by people who are actually nearby.",
  },
  {
    Icon: DollarSign,
    title: "Affordable pricing",
    body: "Start free. Pay only when you want more reach — plans from $2.99 for 30 days.",
  },
  {
    Icon: BarChart2,
    title: "Track your reach",
    body: "See real-time views, saves, and contact clicks for every card you post.",
  },
  {
    Icon: Share2,
    title: "Share anywhere",
    body: "Every card gets its own link — share on social, WhatsApp, email, or anywhere else.",
  },
];

function RecentCard({ card }: { card: WallCard }) {
  const thumb = card.thumbnailImages?.[0] ?? card.images?.[0];
  return (
    <Link href={`/card/${String(card.id)}`} className="home-recent-card">
      <div className={`home-recent-thumb theme-${card.theme}`}>
        {thumb ? (
          <img src={thumb} alt={card.name} loading="lazy" decoding="async" />
        ) : (
          <span>{card.name.charAt(0)}</span>
        )}
      </div>
      <div className="home-recent-info">
        <span className="home-recent-category">{card.category}</span>
        <strong className="home-recent-name">{card.name}</strong>
        <span className="home-recent-line">{card.line}</span>
        {(card.city ?? card.area) ? (
          <span className="home-recent-location">
            <MapPin size={11} />
            {card.city ?? card.area}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export async function HomePage() {
  const [recentCards, topWalls] = await Promise.all([
    fetchInitialCards({}),
    fetchTopWalls(20),
  ]);

  return (
    <>
      <HomeNav />
      <main className="home">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-text">
              <h1 className="home-hero-title">Your city&apos;s local wall</h1>
              <p className="home-hero-subtitle">
                Post and discover local services, jobs, rentals, deals, events, and community updates near you.
              </p>
            </div>
            <HomeSearch />
          </div>
        </section>

        {/* ── Browse by category ───────────────────────────────────────── */}
        <section className="home-section">
          <div className="home-container">
            <h2 className="home-section-title">Browse by category</h2>
            <div className="home-category-grid">
              {categories.filter((cat) => cat !== "All").map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <Link key={cat} href={`/us/${toCategorySlug(cat)}`} className="home-category-item">
                    {Icon ? <Icon size={22} /> : null}
                    <span>{cat}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Recently posted ──────────────────────────────────────────── */}
        {recentCards.length > 0 ? (
          <section className="home-section home-section-alt">
            <div className="home-container">
              <h2 className="home-section-title">Recently posted</h2>
              <div className="home-recent-grid">
                {recentCards.slice(0, 4).map((card) => (
                  <RecentCard key={String(card.id)} card={card} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Trending ───────────────────────────────────────────── */}
        {topWalls.length > 0 ? (
          <section className="home-section home-section-dark">
            <div className="home-container">
              <div className="home-section-header">
                <h2 className="home-section-title">Trending</h2>
                <Link href="/trending" className="home-section-see-all">See all →</Link>
              </div>
              <div className="home-walls-grid">
                {topWalls.map((wall) => (
                  <Link key={wall.path} href={wall.path} className="home-wall-item">
                    <MapPin size={13} />
                    <span className="home-wall-label">{formatWallPath(wall.path)}</span>
                    <span className="home-wall-views">{wall.viewCount.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <section className="home-section home-section-alt">
          <div className="home-container">
            <h2 className="home-section-title">How LocalWall works</h2>
            <div className="home-steps">
              {HOW_IT_WORKS.map(({ num, Icon, title, desc }) => (
                <div key={num} className="home-step">
                  <div className="home-step-num">{num}</div>
                  <div className="home-step-icon"><Icon size={22} /></div>
                  <strong className="home-step-title">{title}</strong>
                  <p className="home-step-desc">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── List for Free CTA ────────────────────────────────────────── */}
        <section className="home-cta-section">
          <div className="home-container home-cta-row">
            <div className="home-cta-copy">
              <h2 className="home-cta-title">List for free</h2>
              <p className="home-cta-body">
                Your first ad is always free — no account required. Upgrade when you're ready for more reach.
              </p>
            </div>
            <Link href="/us" className="home-cta-btn">
              Post a free ad →
            </Link>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────────── */}
        <section className="home-section">
          <div className="home-container">
            <h2 className="home-section-title">What locals are saying</h2>
            <div className="home-testimonials-grid">
              {TESTIMONIALS.map(({ quote, name, role, location }) => (
                <div key={name} className="home-testimonial">
                  <p className="home-testimonial-quote">"{quote}"</p>
                  <div className="home-testimonial-author">
                    <strong>{name}</strong>
                    <span>{role} · {location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why LocalWall? ───────────────────────────────────────────── */}
        <section className="home-section home-section-alt">
          <div className="home-container">
            <h2 className="home-section-title">Why LocalWall?</h2>
            <div className="home-why-grid">
              {WHY_ITEMS.map(({ Icon, title, body }) => (
                <div key={title} className="home-why-item">
                  <div className="home-why-icon"><Icon size={24} /></div>
                  <strong className="home-why-title">{title}</strong>
                  <p className="home-why-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="home-footer">
          <div className="home-container home-footer-inner">
            <Link href="/" className="home-footer-brand">LocalWall</Link>
            <nav className="home-footer-links">
              {/* <Link href="/us">Browse ads</Link> */}
              <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>
            </nav>
            <p className="home-footer-copy">© {new Date().getFullYear()} LocalWall. All rights reserved.</p>
          </div>
        </footer>

      </main>
    </>
  );
}
