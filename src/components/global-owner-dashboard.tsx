"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { pushDashboardHandler } from "@/lib/dashboard-signal";
import type { CardUpdate, OwnerCard, RenewalAmount, SavedWall, WallCard } from "@/features/wall/types";

const OwnerDashboard = dynamic(
  () => import("@/features/wall/owner-dashboard").then((m) => ({ default: m.OwnerDashboard })),
  { ssr: false, loading: () => null },
);

export function GlobalOwnerDashboard() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => pushDashboardHandler(() => setOpen(true)), []);

  const ownerCards = useQuery(api.cards.listMine, isAuthenticated ? {} : "skip") as OwnerCard[] | undefined;
  const cardDailyStats = useQuery(api.cards.getMyCardDailyStats, isAuthenticated ? {} : "skip") as { dates: string[]; byCard: Record<string, number[]> } | null | undefined;
  const savedCards = useQuery(api.savedCards.list, isAuthenticated ? {} : "skip") as WallCard[] | undefined;
  const savedWallsList = useQuery(api.savedWalls.list, isAuthenticated ? {} : "skip") as Array<{ path: string; label: string; createdAt: number }> | undefined;
  const profile = useQuery(api.cards.getMyProfile, isAuthenticated ? {} : "skip") as { displayName: string | null; username: string | null; businessName: string | null; verified: boolean; verificationStatus: "pending" | "approved" | "rejected" | null } | null | undefined;

  const setCardVisibility = useMutation(api.cards.setVisibility);
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  const renewCard = useMutation(api.cards.renew);
  const cancelAutoRenewAction = useAction(api.payments.cancelAutoRenew);
  const updateProfileMutation = useMutation(api.cards.updateProfile);
  const setSavedCard = useMutation(api.savedCards.setSaved);
  const setSavedWall = useMutation(api.savedWalls.setSaved);
  const finalizeVerification = useAction(api.payments.finalizeVerification);

  // Don't render anything until the user opens the dashboard
  if (!isAuthenticated || !open) return null;

  const savedWalls: SavedWall[] = (savedWallsList ?? []).map((w) => ({ path: w.path, label: w.label, createdAt: w.createdAt }));

  const handleRenew = async (card: OwnerCard, paidAmount: RenewalAmount, autoRenew = false) => {
    if (paidAmount === 0) {
      await renewCard({ cardId: card.id as Id<"cards">, paidAmount });
      return;
    }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalPayload: { cardId: String(card.id), cardName: card.name, paidAmount, autoRenew } }),
    });
    const result = await res.json() as { url?: string; error?: string };
    if (!res.ok || !result.url) throw new Error(result.error || "Could not start renewal checkout.");
    window.location.assign(result.url);
  };

  void finalizeVerification;

  return (
    <OwnerDashboard
      cards={ownerCards ?? []}
      savedCards={savedCards ?? []}
      savedWalls={savedWalls}
      loading={isAuthenticated && ownerCards === undefined}
      onClose={() => setOpen(false)}
      onCreate={() => { setOpen(false); router.push("/us?post=1"); }}
      onView={(card) => { setOpen(false); router.push(`/card/${String(card.id)}`); }}
      onRemoveSaved={async (card) => { await setSavedCard({ cardId: card.id as Id<"cards">, saved: false }); }}
      onRemoveSavedWall={async (wall) => { await setSavedWall({ path: wall.path, label: wall.label, saved: false }); }}
      onNavigateToWall={(wall) => { setOpen(false); router.push(wall.path); }}
      onSetVisibility={async (card, status) => { await setCardVisibility({ cardId: card.id as Id<"cards">, status }); }}
      onUpdate={async (card, update: CardUpdate) => { await updateCard({ cardId: card.id as Id<"cards">, ...update }); }}
      onDelete={async (card) => { await deleteCard({ cardId: card.id as Id<"cards"> }); }}
      onRenew={handleRenew}
      onCancelAutoRenew={async (card) => { await cancelAutoRenewAction({ cardId: card.id as Id<"cards"> }); }}
      profile={profile ?? null}
      onUpdateProfile={async (username, businessName) => { await updateProfileMutation({ username, businessName }); }}
      onRequestVerification={async (plan) => {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationPayload: { plan } }),
        });
        const result = await res.json() as { url?: string; error?: string };
        if (!res.ok || !result.url) throw new Error(result.error || "Could not start verification checkout.");
        window.location.assign(result.url);
      }}
      cardDailyStats={cardDailyStats ?? null}
    />
  );
}
