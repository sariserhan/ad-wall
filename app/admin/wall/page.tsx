import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { fetchInitialCards } from "@/lib/server-cards";
import { WallPageShell } from "@/features/wall/wall-page-shell";
import { api } from "../../../convex/_generated/api";

export const metadata: Metadata = { title: "Admin Playground Wall", robots: { index: false, follow: false } };

const PG_LOCATION = { country: "xx", state: "test", city: "Playground" };

export default async function AdminWallPage() {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) redirect("/");

  const token = await getToken({ template: "convex" });
  if (!token) redirect("/");

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  const access: { isAdmin: boolean } = await convex.query(api.admin.getAccess, {});
  if (!access.isAdmin) {
    return (
      <main className="nf-page">
        <div className="nf-grain" />
        <div className="nf-ghost nf-ghost-1" aria-hidden="true" />
        <div className="nf-ghost nf-ghost-2" aria-hidden="true" />
        <div className="nf-ghost nf-ghost-3" aria-hidden="true" />

        <div className="nf-card support-card">
          <div className="nf-tape" aria-hidden="true" />
          <div className="nf-stamp" aria-hidden="true">DENIED</div>

          <p className="nf-eyebrow">Notice · Error 403</p>
          <h1 className="nf-code">403</h1>
          <h2 className="nf-headline">Forbidden access.</h2>
          <p className="support-card-body">
            You do not have permission to view this admin wall.
          </p>

          <div className="support-card-actions">
            <a href="/" className="nf-btn-primary">Back to LocalWall</a>
            <a href="/trending" className="nf-btn-secondary">Browse listings</a>
          </div>

          <footer className="nf-card-footer">
            <span>LocalWall</span>
            <span>your local bulletin board</span>
          </footer>
        </div>

        <p className="nf-brand">WALL</p>
      </main>
    );
  }

  const initialCards = await fetchInitialCards(PG_LOCATION);
  return (
    <WallPageShell
      initialLocation={PG_LOCATION}
      initialCards={initialCards}
    />
  );
}
