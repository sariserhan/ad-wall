import Link from "next/link";
import {
  Baby,
  BarChart2,
  Briefcase,
  Building2,
  Car,
  Check,
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
import { fetchInitialCards } from "@/lib/server-cards";
import { categories } from "@/features/wall/types";
import { toCategorySlug, buildWallPath } from "@/lib/wall-slug";
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

const TOP_CATEGORIES = [
  "Services",
  "Repairs",
  "Jobs",
  "Real Estate",
  "Buy & Sell Marketplace",
  "Food & Catering",
  "Health & Fitness",
  "Shops & Retail",
  "Home & Garden",
  "Events & Entertainment",
] as const;

const POPULAR_LOCATIONS = [
  { label: "New York, NY",      path: "/us/ny/new-york" },
  { label: "Brooklyn, NY",      path: "/us/ny/brooklyn" },
  { label: "Philadelphia, PA",  path: "/us/pa/philadelphia" },
  { label: "Boston, MA",        path: "/us/ma/boston" },
  { label: "Washington, DC",    path: "/us/dc/washington" },
  { label: "Miami, FL",         path: "/us/fl/miami" },
  { label: "Atlanta, GA",       path: "/us/ga/atlanta" },
  { label: "Charlotte, NC",     path: "/us/nc/charlotte" },
  { label: "Chicago, IL",       path: "/us/il/chicago" },
  { label: "Houston, TX",       path: "/us/tx/houston" },
  { label: "Dallas, TX",        path: "/us/tx/dallas" },
  { label: "Austin, TX",        path: "/us/tx/austin" },
  { label: "Phoenix, AZ",       path: "/us/az/phoenix" },
  { label: "San Antonio, TX",   path: "/us/tx/san-antonio" },
  { label: "Las Vegas, NV",     path: "/us/nv/las-vegas" },
  { label: "Denver, CO",        path: "/us/co/denver" },
  { label: "Los Angeles, CA",   path: "/us/ca/los-angeles" },
  { label: "San Francisco, CA", path: "/us/ca/san-francisco" },
  { label: "Seattle, WA",       path: "/us/wa/seattle" },
  { label: "Portland, OR",      path: "/us/or/portland" },
];

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

const QUAL_STATS = [
  { Icon: Check, label: "Free to post" },
  { Icon: Check, label: "No account required" },
  { Icon: Check, label: "Live in minutes" },
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
  const recentCards = await fetchInitialCards({});

  return (
    <>
      <HomeNav />
      <main className="home">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-text">
              <h1 className="home-hero-title">Your local bulletin wall</h1>
              <p className="home-hero-subtitle">
                Find and post local ads for services, jobs, real estate, and everything in between.
              </p>
            </div>
            <HomeSearch />
          </div>
        </section>

        {/* ── Qualitative social proof ──────────────────────────────────── */}
        <div className="home-stats-bar">
          <div className="home-container home-stats-row">
            {QUAL_STATS.map((stat, i) => (
              <div key={stat.label} className="home-stat-item">
                {i > 0 ? <div className="home-stat-divider" /> : null}
                <stat.Icon size={16} className="home-stat-icon" />
                <span className="home-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Browse by category ───────────────────────────────────────── */}
        <section className="home-section">
          <div className="home-container">
            <h2 className="home-section-title">Browse by category</h2>
            <div className="home-category-grid">
              {TOP_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <Link key={cat} href={`/us/${toCategorySlug(cat)}`} className="home-category-item">
                    {Icon ? <Icon size={22} /> : null}
                    <span>{cat}</span>
                  </Link>
                );
              })}
            </div>
            <div className="home-category-footer">
              <Link href="/us" className="home-category-view-all">
                Browse all {categories.length - 1} categories →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Recently posted ──────────────────────────────────────────── */}
        {recentCards.length > 0 ? (
          <section className="home-section home-section-alt">
            <div className="home-container">
              <h2 className="home-section-title">Recently posted</h2>
              <div className="home-recent-grid">
                {recentCards.slice(0, 9).map((card) => (
                  <RecentCard key={String(card.id)} card={card} />
                ))}
              </div>
              <div className="home-recent-cta">
                <Link href="/us" className="primary home-browse-btn">
                  Browse all ads
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Popular Locations ────────────────────────────────────────── */}
        <section className="home-section home-section-dark">
          <div className="home-container">
            <h2 className="home-section-title">Popular locations</h2>
            <div className="home-walls-grid">
              {POPULAR_LOCATIONS.map((loc) => (
                <Link key={loc.path} href={loc.path} className="home-wall-item">
                  <MapPin size={13} />
                  {loc.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

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
              <Link href="/us">Browse ads</Link>
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
