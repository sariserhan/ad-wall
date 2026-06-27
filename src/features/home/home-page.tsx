import { Suspense } from "react";
import { HomeNav } from "./home-nav";
import { HomeSearch } from "./home-search";
import { HomeHowItWorksModal } from "./home-how-it-works-modal";
import Link from "next/link";
import { BugReportLink } from "@/components/bug-report-link";
import { ContactLink } from "@/components/contact-link";
import { PrivacySettingsLink } from "@/components/privacy-settings-link";

export function HomePage() {
  return (
    <>
      <HomeNav />
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
