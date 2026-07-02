import { Suspense } from "react";
import { TrendingUp, BadgePlus, MapPinned, Sparkles } from "lucide-react";
import { HomeNav } from "./home-nav";
import { HomeSearch } from "./home-search";
import { HomeHowItWorksModal } from "./home-how-it-works-modal";
import Link from "next/link";
import { BugReportLink } from "@/components/bug-report-link";
import { ContactLink } from "@/components/contact-link";
import { PrivacySettingsLink } from "@/components/privacy-settings-link";

const spotlightCards = [
  { title: "Mobile car wash", meta: "Service · Queens", note: "Same-day details" },
  { title: "Studio sublet", meta: "Real Estate · Brooklyn", note: "2 bed · $2,450" },
  { title: "Weekend guitar lessons", meta: "Community · Chicago", note: "Beginner friendly" },
] as const;

const browseCategories = [
  { title: "Jobs", desc: "Hiring, gigs, and freelance work" },
  { title: "Services", desc: "Local help for homes and businesses" },
  { title: "Real Estate", desc: "Rentals, rooms, and spaces" },
  { title: "Deals", desc: "Discounts and quick wins nearby" },
  { title: "Events", desc: "Pop-ups, shows, and meetups" },
  { title: "Community", desc: "Neighbors helping neighbors" },
] as const;

const recentPosts = [
  { category: "Deal", title: "50% off winter window cleaning", line: "Serving most neighborhoods this week" },
  { category: "Job", title: "Weekend delivery driver needed", line: "Flexible hours, local routes" },
  { category: "Rent", title: "Bright studio near transit", line: "Walk-up · Available now" },
  { category: "Event", title: "Open mic at the corner cafe", line: "Friday night · All ages welcome" },
] as const;

const newThisWeek = [
  { title: "Handyman for small fixes", meta: "Brooklyn · Services", note: "Posted 2 days ago" },
  { title: "Backyard studio opening", meta: "Austin · Real Estate", note: "Posted yesterday" },
  { title: "Weekend tutoring spots", meta: "Boston · Community", note: "Posted today" },
  { title: "Local cafe hiring baristas", meta: "Seattle · Jobs", note: "Posted 3 days ago" },
] as const;

const popularWalls = [
  { city: "New York", area: "NY", views: "1.2k views" },
  { city: "Los Angeles", area: "CA", views: "980 views" },
  { city: "Chicago", area: "IL", views: "860 views" },
  { city: "Austin", area: "TX", views: "760 views" },
] as const;

const SHOW_FUTURE_SECTIONS = false;

export function HomePage({ isSignedIn = false, isAdmin = false }: { isSignedIn?: boolean; isAdmin?: boolean } = {}) {
  return (
    <>
      <HomeNav isSignedIn={isSignedIn} showAvatarButton={isSignedIn} isAdmin={isAdmin} />
      <main className="home">

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

        <section className="home-highlights">
          <div className="home-container home-highlights-inner">
            <article className="home-highlight-card home-highlight-card--tilt-right">
              <p className="home-highlight-eyebrow"><BadgePlus size={12} />How it works</p>
              <h2>Post a card in three quick steps</h2>
              <ol className="home-highlight-steps">
                <li><MapPinned size={11} />Pick your wall</li>
                <li><BadgePlus size={11} />Create your card</li>
                <li><TrendingUp size={11} />Get seen locally</li>
              </ol>
            </article>

            <article className="home-highlight-card">
              <p className="home-highlight-eyebrow"><Sparkles size={12} />What people post</p>
              <h2>Built for everyday local stuff</h2>
              <div className="home-highlight-previews" aria-label="Sample wall cards">
                {spotlightCards.map((card) => (
                  <div key={card.title} className="home-highlight-preview">
                    <div className="home-highlight-preview-tape" />
                    <span className="home-highlight-preview-cat">{card.meta}</span>
                    <strong className="home-highlight-preview-title">{card.title}</strong>
                    <span className="home-highlight-preview-note">{card.note}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="home-highlight-card home-highlight-card--tilt-left">
              <p className="home-highlight-eyebrow"><TrendingUp size={12} />Trending now</p>
              <h2>See what is moving on the wall</h2>
              <p>Open the busiest walls, most viewed cards, and the local posts getting attention right now.</p>
              <Link href="/trending" className="home-highlight-link">Open trending</Link>
            </article>
          </div>
        </section>

        {SHOW_FUTURE_SECTIONS ? (
          <>
            <section className="home-section home-section--wall">
              <div className="home-container">
                <div className="home-section-header">
                  <h2 className="home-section-title">Recent wall posts</h2>
                  <Link href="/trending" className="home-section-see-all">Open wall</Link>
                </div>
                <div className="home-recent-grid">
                  {recentPosts.map((post, index) => (
                    <Link key={post.title} href="/trending" className={`home-recent-card home-recent-card--tilt-${(index % 3) + 1}`}>
                      <div className="home-recent-thumb theme-biz">
                        <span>{post.category}</span>
                      </div>
                      <div className="home-recent-info">
                        <span className="home-recent-category">{post.category}</span>
                        <strong className="home-recent-name">{post.title}</strong>
                        <span className="home-recent-line">{post.line}</span>
                        <span className="home-recent-location"><MapPinned size={10} />LocalWall</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="home-section home-section--wall home-section--new-week">
              <div className="home-container">
                <div className="home-section-header">
                  <h2 className="home-section-title">New this week</h2>
                  <Link href="/trending" className="home-section-see-all">See new posts</Link>
                </div>
                <div className="home-new-week-grid">
                  {newThisWeek.map((post, index) => (
                    <article key={post.title} className={`home-new-week-card home-new-week-card--tilt-${(index % 3) + 1}`}>
                      <div className="home-new-week-tape" />
                      <span className="home-new-week-meta">{post.meta}</span>
                      <strong className="home-new-week-title">{post.title}</strong>
                      <span className="home-new-week-note">{post.note}</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="home-section home-section--wall home-section--popular">
              <div className="home-container">
                <div className="home-section-header">
                  <h2 className="home-section-title">Popular walls</h2>
                  <Link href="/trending" className="home-section-see-all">View all walls</Link>
                </div>
                <div className="home-popular-walls-grid">
                  {popularWalls.map((wall, index) => (
                    <Link key={`${wall.city}-${wall.area}`} href="/trending" className={`home-popular-wall home-popular-wall--tilt-${(index % 4) + 1}`}>
                      <span className="home-popular-wall-rank">#{index + 1}</span>
                      <strong className="home-popular-wall-city">{wall.city}</strong>
                      <span className="home-popular-wall-area">{wall.area}</span>
                      <span className="home-popular-wall-views">{wall.views}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        <footer className="home-footer">
          <div className="home-container home-footer-inner">
            <Link href="/" className="home-footer-brand">LocalWall</Link>
            <nav className="home-footer-links">
              <HomeHowItWorksModal />
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

      </main>
    </>
  );
}
