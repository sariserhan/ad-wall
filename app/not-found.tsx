import Link from "next/link";
import { headers } from "next/headers";
import "@fontsource/barlow-condensed/900.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/800.css";
import "./globals.css";

export default async function NotFound() {
  const h = await headers();
  const countryCode =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    null;
  const browseHref = countryCode ? `/${countryCode.toLowerCase()}` : "/";

  return (
    <div className="nf-page">
      <div className="nf-grain" />

      {/* ghost cards behind for wall atmosphere */}
      <div className="nf-ghost nf-ghost-1" aria-hidden="true" />
      <div className="nf-ghost nf-ghost-2" aria-hidden="true" />
      <div className="nf-ghost nf-ghost-3" aria-hidden="true" />

      <div className="nf-card">
        <div className="nf-tape" aria-hidden="true" />
        <div className="nf-stamp" aria-hidden="true">REMOVED</div>

        <p className="nf-eyebrow">Notice · Error 404</p>
        <h1 className="nf-code">404</h1>
        <h2 className="nf-headline">This spot is empty.</h2>
        <p className="nf-body">
          The page you&apos;re looking for has been torn down, moved, or never existed on this wall.
        </p>

        <div className="nf-actions">
          <Link href="/" className="nf-btn-primary">Back to Wall</Link>
          <Link href={browseHref} className="nf-btn-secondary">Browse listings</Link>
        </div>

        <footer className="nf-card-footer">
          <span>LocalWall</span>
          <span>your local bulletin board</span>
        </footer>
      </div>

      <p className="nf-brand">WALL</p>
    </div>
  );
}
