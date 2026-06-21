"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { WallApp } from "./wall-app";
import { getCardFormat, type CardDraft, type CardUpdate, type OwnerCard, type Placement, type RenewalAmount, type WallCard, type CardCategory, type CardImageMode, type CardTheme } from "./types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ConnectedWallApp() {
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useAuth();
  const [layoutCards, setLayoutCards] = useState<WallCard[] | null>(null);
  const hasAppliedInitialServerSnapshotRef = useRef(false);
  const publishedCards = useQuery(api.cards.listPublished) as WallCard[] | undefined;
  const renderCards = useMemo(() => layoutCards ?? publishedCards ?? [], [layoutCards, publishedCards]);
  const pendingCreatedCards = useMemo(() => {
    if (publishedCards === undefined || !hasAppliedInitialServerSnapshotRef.current) return [];
    const layoutIds = new Set((layoutCards ?? []).map((card) => String(card.id)));
    return publishedCards.filter((card) => !layoutIds.has(String(card.id)));
  }, [layoutCards, publishedCards]);
  const liveCardIds = useMemo(() => renderCards.map((card) => card.id as Id<"cards">), [renderCards]);
  const liveViewCounts = useQuery(api.cards.getLiveViewCounts, liveCardIds.length === 0 ? "skip" : { cardIds: liveCardIds }) as Array<{ id: Id<"cards">; clicks: number }> | undefined;
  const cards = useMemo(() => {
    if (renderCards.length === 0 && publishedCards === undefined && layoutCards === null) return undefined;
    const counts = new Map((liveViewCounts ?? []).map((item) => [String(item.id), item.clicks]));
    return renderCards.map((card) => ({ ...card, clicks: counts.get(String(card.id)) ?? card.clicks ?? 0 }));
  }, [layoutCards, liveViewCounts, publishedCards, renderCards]);
  const ownerCards = useQuery(api.cards.listMine, isAuthenticated ? {} : "skip") as OwnerCard[] | undefined;
  const generateUploadUrl = useMutation(api.cards.generateUploadUrl);
  const createCard = useMutation(api.cards.create);
  const incrementCardClicks = useMutation(api.cards.incrementClicks);
  const setCardVisibility = useMutation(api.cards.setVisibility);
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  const renewCard = useMutation(api.cards.renew);
  const updateCardPosition = useMutation(api.cards.updatePosition);
  const { openSignIn } = useClerk();
  const searchParams = useSearchParams();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const ownedCardIds = useMemo(() => new Set((ownerCards ?? []).map((card) => String(card.id))), [ownerCards]);

  useEffect(() => {
    if (publishedCards === undefined) return;
    if (hasAppliedInitialServerSnapshotRef.current) return;

    setLayoutCards(publishedCards);
    hasAppliedInitialServerSnapshotRef.current = true;
  }, [publishedCards]);

  const addCardToLocalWall = useCallback((card: WallCard) => {
    setLayoutCards((current) => {
      const cardsOnWall = current ?? [];
      return cardsOnWall.some((existing) => String(existing.id) === String(card.id))
        ? cardsOnWall.map((existing) => String(existing.id) === String(card.id) ? card : existing)
        : [...cardsOnWall, card];
    });
  }, []);

  const refreshWallFromServer = useCallback(() => {
    if (publishedCards === undefined) return;
    setLayoutCards(publishedCards);
  }, [publishedCards]);

  useEffect(() => {
    if (isAuthenticated) setCheckoutMessage((message) => message?.startsWith("Finishing sign-in") ? null : message);
  }, [isAuthenticated]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const checkoutStatus = searchParams.get("checkout");
    if (!sessionId || !checkoutStatus) return;

    const processCheckout = async () => {
      if (checkoutStatus === "canceled") {
        setCheckoutMessage("Payment canceled. No changes were made.");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (checkoutStatus !== "success") return;
      if (isProcessingCheckout) return;

      setIsProcessingCheckout(true);
      try {
        const verify = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`);
        const verified = await verify.json() as { success: boolean; error?: string; session?: { metadata?: Record<string, string> } };
        if (!verify.ok || !verified.success) throw new Error(verified.error || "Payment verification failed.");

        const metadata = verified.session?.metadata;
        if (metadata?.kind === "renewal") {
          const paidAmount = Number(metadata.paidAmount);
          if (![1, 3, 10, 20].includes(paidAmount) || !metadata.cardId) throw new Error("The renewal details are invalid.");
          await renewCard({ cardId: metadata.cardId as Id<"cards">, paidAmount: paidAmount as 1 | 3 | 10 | 20 });
          setCheckoutMessage("Payment succeeded and your card has been renewed.");
          return;
        }

        const stored = window.localStorage.getItem(`stripe-checkout-draft-${sessionId}`);
        if (!stored) throw new Error("Could not find the card draft for this payment.");

        const cardPayload = JSON.parse(stored) as {
          name: string;
          category: CardCategory;
          line: string;
          message?: string;
          area: string;
          city?: string;
          state?: string;
          country?: string;
          zipcode?: string;
          price?: string;
          phone?: string;
          email?: string;
          website?: string;
          location?: string;
          instagram?: string;
          facebook?: string;
          tiktok?: string;
          linkedin?: string;
          paidAmount: number;
          theme: CardTheme;
          imageMode?: CardImageMode;
          imageIds: Id<"_storage">[];
          x: number;
          y: number;
          rotation: number;
          width: number;
        };
        const paidAmount = Number(metadata?.paidAmount);
        if (metadata?.kind !== "posting" || ![1, 3, 10, 20].includes(paidAmount)) throw new Error("The paid card details are invalid.");

        const createdCard = await createCard({
          name: cardPayload.name,
          category: cardPayload.category,
          line: cardPayload.line,
          message: cardPayload.message,
          area: cardPayload.area,
          city: cardPayload.city ?? "",
          state: cardPayload.state ?? "",
          country: cardPayload.country ?? "",
          zipcode: cardPayload.zipcode,
          price: cardPayload.price,
          phone: cardPayload.phone,
          email: cardPayload.email,
          website: cardPayload.website,
          location: cardPayload.location,
          instagram: cardPayload.instagram,
          facebook: cardPayload.facebook,
          tiktok: cardPayload.tiktok,
          linkedin: cardPayload.linkedin,
          paidAmount,
          theme: cardPayload.theme,
          imageMode: cardPayload.imageMode,
          imageIds: cardPayload.imageIds,
          x: cardPayload.x,
          y: cardPayload.y,
          rotation: cardPayload.rotation,
          width: cardPayload.width,
        }) as WallCard;
        addCardToLocalWall(createdCard);
        window.localStorage.removeItem(`stripe-checkout-draft-${sessionId}`);
        setCheckoutMessage("Payment succeeded and your card is now on the wall.");
      } catch (cause) {
        setCheckoutMessage(cause instanceof Error ? cause.message : "Payment could not be finalized.");
      } finally {
        setIsProcessingCheckout(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    processCheckout();
  }, [searchParams, isProcessingCheckout, createCard, renewCard, addCardToLocalWall]);

  const uploadImage = async (file: File): Promise<Id<"_storage">> => {
    if (!allowedImageTypes.has(file.type)) throw new Error("Images must be JPG, PNG, or WEBP.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be smaller than 8MB.");

    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("An image upload failed. Please try again.");
    const result = await response.json() as { storageId: Id<"_storage"> };
    return result.storageId;
  };

  const handleCreate = async (draft: CardDraft, placement: Placement): Promise<WallCard | void> => {
    if (!isAuthenticated) throw new Error("Please finish signing in before posting a card.");
    const imageIds = await Promise.all(draft.files.slice(0, 2).map(uploadImage));
    const paidAmount = draft.paymentOption === "free" ? 0 : Number(draft.paymentOption);
    const cardPayload = {
      name: draft.name,
      category: draft.category,
      line: draft.line,
      message: draft.message,
      area: draft.area,
      city: draft.city,
      state: draft.state,
      country: draft.country,
      zipcode: draft.zipcode,
      price: draft.price,
      phone: draft.phone,
      email: draft.email,
      website: draft.website,
      location: draft.location,
      instagram: draft.instagram,
      facebook: draft.facebook,
      tiktok: draft.tiktok,
      linkedin: draft.linkedin,
      paidAmount,
      theme: draft.theme,
      imageMode: draft.imageMode,
      imageIds,
      x: placement.x,
      y: placement.y,
      rotation: -3 + Math.random() * 6,
      width: getCardFormat(draft.imageMode === "business-card" ? "biz" : draft.theme).width,
    };
    if (paidAmount > 0) {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardPayload }),
      });
      const result = await response.json() as { url?: string; sessionId?: string; error?: string };
      if (!response.ok || !result.url || !result.sessionId) throw new Error(result.error || "Could not start card checkout.");
      window.localStorage.setItem(`stripe-checkout-draft-${result.sessionId}`, JSON.stringify(cardPayload));
      window.location.assign(result.url);
      return;
    }

    const card = await createCard(cardPayload) as WallCard;
    addCardToLocalWall(card);
    return card;
  };

  const handleRenew = async (card: OwnerCard, paidAmount: RenewalAmount) => {
    if (paidAmount === 0) {
      await renewCard({ cardId: card.id as Id<"cards">, paidAmount });
      setCheckoutMessage(`${card.name} was renewed for 1 day.`);
      return;
    }

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalPayload: { cardId: String(card.id), cardName: card.name, paidAmount } }),
    });
    const result = await response.json() as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error || "Could not start renewal checkout.");
    window.location.assign(result.url);
  };

  return (
    <WallApp
      mode="connected"
      cards={cards}
      pendingCreatedCards={pendingCreatedCards}
      onRefreshWall={refreshWallFromServer}
      isLoading={cards === undefined && layoutCards === null}
      isSignedIn={isAuthenticated}
      onRequestSignIn={() => {
        if (!isClerkLoaded || isConvexAuthLoading) {
          setCheckoutMessage("Loading sign-in. Please try again in a moment.");
          return;
        }
        if (isClerkSignedIn && !isAuthenticated) {
          setCheckoutMessage("Finishing sign-in with Convex…");
          return;
        }
        if (isClerkSignedIn) return;
        void openSignIn();
      }}
      onCreateCard={handleCreate}
      onCardOpen={(card) => {
        if (!card.id.toString().startsWith("demo-")) {
          incrementCardClicks({ cardId: card.id as any });
        }
      }}
      authControl={isClerkSignedIn ? <UserButton /> : <button className="auth-sign-in" onClick={() => openSignIn()}>Sign in</button>}
      notice={checkoutMessage}
      ownerCards={isAuthenticated ? (ownerCards ?? []) : undefined}
      ownedCardIds={ownedCardIds}
      ownerCardsLoading={isAuthenticated && ownerCards === undefined}
      onSetCardStatus={async (card, status) => {
        await setCardVisibility({ cardId: card.id as Id<"cards">, status });
        if (status === "hidden") {
          setLayoutCards((current) => current?.filter((item) => String(item.id) !== String(card.id)) ?? current);
        } else {
          addCardToLocalWall(card);
        }
      }}
      onUpdateCard={async (card, update: CardUpdate) => {
        await updateCard({ cardId: card.id as Id<"cards">, ...update });
        setLayoutCards((current) => current?.map((item) => String(item.id) === String(card.id) ? { ...item, ...update } : item) ?? current);
      }}
      onDeleteCard={async (card) => {
        await deleteCard({ cardId: card.id as Id<"cards"> });
        setLayoutCards((current) => current?.filter((item) => String(item.id) !== String(card.id)) ?? current);
      }}
      onRenewCard={handleRenew}
      onMoveCard={async (card, placement) => {
        await updateCardPosition({ cardId: card.id as Id<"cards">, x: placement.x, y: placement.y });
        setLayoutCards((current) => current?.map((item) => String(item.id) === String(card.id) ? { ...item, ...placement, positionLockedAt: Date.now() } : item) ?? current);
      }}
    />
  );
}
