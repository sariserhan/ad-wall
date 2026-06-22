"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AdminPanel, type AdminDashboardData } from "./admin-panel";
import { WallApp } from "./wall-app";
import { getCardFormat, type CardDraft, type CardUpdate, type OwnerCard, type Placement, type RenewalAmount, type WallCard } from "./types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ImageVariants {
  full: File;
  thumbnail: File;
}

async function encodeWebpVariant(bitmap: ImageBitmap, sourceName: string, suffix: string, maxDimension: number, quality: number) {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("This browser could not convert the image to WebP.");
  const baseName = sourceName.replace(/\.[^.]+$/, "") || "wall-card";
  return new File([blob], `${baseName}-${suffix}.webp`, { type: "image/webp", lastModified: Date.now() });
}

async function createImageVariants(file: File): Promise<ImageVariants> {
  const bitmap = await createImageBitmap(file);
  try {
    const [full, thumbnail] = await Promise.all([
      encodeWebpVariant(bitmap, file.name, "full", 1920, 0.86),
      encodeWebpVariant(bitmap, file.name, "thumb", 640, 0.78),
    ]);
    return { full, thumbnail };
  } finally {
    bitmap.close();
  }
}

export function ConnectedWallApp({ initialCardId }: { initialCardId?: string }) {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useAuth();
  const [layoutCards, setLayoutCards] = useState<WallCard[] | null>(null);
  const hasAppliedInitialServerSnapshotRef = useRef(false);
  const publishedCards = useQuery(api.cards.listPublished, {
    country: searchParams.get("country") || undefined,
    state: searchParams.get("state") || undefined,
    city: searchParams.get("city") || undefined,
  }) as WallCard[] | undefined;
  const directCard = useQuery(api.cards.getPublishedById, initialCardId ? { cardId: initialCardId as Id<"cards"> } : "skip") as WallCard | null | undefined;
  const renderCards = useMemo(() => {
    const baseCards = layoutCards ?? publishedCards ?? [];
    if (!directCard || baseCards.some((card) => String(card.id) === String(directCard.id))) return baseCards;
    return [...baseCards, directCard];
  }, [directCard, layoutCards, publishedCards]);
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
  const savedCards = useQuery(api.savedCards.list, isAuthenticated ? {} : "skip") as WallCard[] | undefined;
  const adminAccess = useQuery(api.admin.getAccess, isAuthenticated ? {} : "skip") as { isAdmin: boolean } | undefined;
  const [adminOpen, setAdminOpen] = useState(false);
  const adminDashboard = useQuery(api.admin.getDashboard, adminOpen && adminAccess?.isAdmin ? {} : "skip") as AdminDashboardData | undefined;
  const profile = useQuery(api.cards.getMyProfile, isAuthenticated ? {} : "skip") as { displayName: string | null; username: string | null; businessName: string | null } | null | undefined;
  const updateProfileMutation = useMutation(api.cards.updateProfile);
  const generateUploadUrl = useMutation(api.cards.generateUploadUrl);
  const createCard = useMutation(api.cards.create);
  const incrementCardClicks = useMutation(api.cards.incrementClicks);
  const setCardVisibility = useMutation(api.cards.setVisibility);
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  const renewCard = useMutation(api.cards.renew);
  const updateCardPosition = useMutation(api.cards.updatePosition);
  const adminSetCardStatus = useMutation(api.admin.setCardStatus);
  const adminRemoveCard = useMutation(api.admin.removeCard);
  const adminBlockUser = useMutation(api.admin.blockUser);
  const adminUnblockUser = useMutation(api.admin.unblockUser);
  const adminResolveReport = useMutation(api.admin.resolveReport);
  const adminSendTestEmail = useAction(api.admin.sendTestReminderEmail);
  const recordCardEvent = useMutation(api.cards.recordEvent);
  const reportCard = useMutation(api.cards.report);
  const setSavedCard = useMutation(api.savedCards.setSaved);
  const mergeLocalSavedCards = useMutation(api.savedCards.mergeLocal);
  const finalizePaidCard = useAction(api.payments.finalizePaidCard);
  const finalizePaidRenewal = useAction(api.payments.finalizePaidRenewal);
  const { openSignUp } = useClerk();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const ownedCardIds = useMemo(() => new Set((ownerCards ?? []).map((card) => String(card.id))), [ownerCards]);
  const hasMergedLocalSavedCardsRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasMergedLocalSavedCardsRef.current = false;
      return;
    }
    if (savedCards === undefined || hasMergedLocalSavedCardsRef.current) return;
    hasMergedLocalSavedCardsRef.current = true;
    const merge = async () => {
      try {
        const localIds = JSON.parse(window.localStorage.getItem("savedWallCards") ?? "[]") as unknown;
        const cardIds = Array.isArray(localIds) ? localIds.filter((id): id is string => typeof id === "string") : [];
        if (cardIds.length > 0) await mergeLocalSavedCards({ cardIds: cardIds.slice(0, 100) });
        window.localStorage.removeItem("savedWallCards");
      } catch (cause) {
        hasMergedLocalSavedCardsRef.current = false;
        setCheckoutMessage(cause instanceof Error ? cause.message : "Saved cards could not be synchronized.");
      }
    };
    void merge();
  }, [isAuthenticated, mergeLocalSavedCards, savedCards]);

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
        const pendingCardId = searchParams.get("pending_card_id");
        const checkoutKind = searchParams.get("kind");
        if (checkoutKind === "renewal") {
          const cardId = searchParams.get("card_id");
          if (!cardId) throw new Error("The renewal card is missing.");
          await finalizePaidRenewal({ sessionId, cardId: cardId as Id<"cards"> });
          setCheckoutMessage("Payment succeeded and your card has been renewed.");
          return;
        }

        if (!pendingCardId) throw new Error("Could not find the pending paid card.");
        const createdCard = await finalizePaidCard({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard;
        addCardToLocalWall(createdCard);
        setCheckoutMessage("Payment succeeded and your card is now on the wall.");
      } catch (cause) {
        setCheckoutMessage(cause instanceof Error ? cause.message : "Payment could not be finalized.");
      } finally {
        setIsProcessingCheckout(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    processCheckout();
  }, [searchParams, isProcessingCheckout, finalizePaidCard, finalizePaidRenewal, addCardToLocalWall]);

  const uploadVariant = async (file: File): Promise<Id<"_storage">> => {
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

  const uploadImageVariants = async (file: File) => {
    if (!allowedImageTypes.has(file.type)) throw new Error("Images must be JPG, PNG, or WEBP.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be smaller than 8MB.");
    const variants = await createImageVariants(file);
    const [imageId, thumbnailImageId] = await Promise.all([
      uploadVariant(variants.full),
      uploadVariant(variants.thumbnail),
    ]);
    return { imageId, thumbnailImageId };
  };

  const handleCreate = async (draft: CardDraft, placement: Placement): Promise<WallCard | void> => {
    if (!isAuthenticated) throw new Error("Please finish signing in before posting a card.");
    const uploadedImages = await Promise.all(draft.files.slice(0, 2).map(uploadImageVariants));
    const imageIds = uploadedImages.map((image) => image.imageId);
    const thumbnailImageIds = uploadedImages.map((image) => image.thumbnailImageId);
    const paidAmount = draft.paymentOption === "free" ? 0 : Number(draft.paymentOption);
    const cardPayload = {
      name: draft.name,
      category: draft.category,
      line: draft.line,
      message: draft.message,
      area: draft.area,
      city: draft.city || searchParams.get("city") || "",
      state: draft.state || searchParams.get("state") || "",
      country: draft.country || searchParams.get("country") || "",
      zipcode: draft.zipcode,
      neighborhood: draft.neighborhood,
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
      thumbnailImageIds,
      x: placement.x,
      y: placement.y,
      rotation: -3 + Math.random() * 6,
      width: getCardFormat(draft.imageMode === "business-card" ? "biz" : draft.theme).width,
    };
    const result = await createCard(cardPayload) as WallCard | { pendingCardId: Id<"pendingCards"> };
    if (paidAmount > 0) {
      if (!("pendingCardId" in result)) throw new Error("The paid card could not be prepared.");
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingCardId: result.pendingCardId, paidAmount, cardName: draft.name }),
      });
      const checkoutResult = await response.json() as { url?: string; sessionId?: string; error?: string };
      if (!response.ok || !checkoutResult.url || !checkoutResult.sessionId) throw new Error(checkoutResult.error || "Could not start card checkout.");
      window.location.assign(checkoutResult.url);
      return;
    }
    const card = result as WallCard;
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
    <>
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
        void openSignUp();
      }}
      onCreateCard={handleCreate}
      onCardOpen={(card) => {
        if (!card.id.toString().startsWith("demo-")) {
          incrementCardClicks({ cardId: card.id as any });
        }
      }}
      onCardEvent={(card, event) => {
        if (event === "save") return;
        if (!String(card.id).startsWith("demo-")) void recordCardEvent({ cardId: card.id as Id<"cards">, event });
      }}
      onReportCard={async (card, reason, details) => {
        await reportCard({ cardId: card.id as Id<"cards">, reason, details });
      }}
      authControl={isClerkSignedIn ? <UserButton /> : null}
      notice={checkoutMessage}
      ownerCards={isAuthenticated ? (ownerCards ?? []) : undefined}
      savedCards={isAuthenticated ? (savedCards ?? []) : []}
      initialCardId={initialCardId}
      onSetSavedCard={async (card, saved) => {
        await setSavedCard({ cardId: card.id as Id<"cards">, saved });
      }}
      ownedCardIds={ownedCardIds}
      isAdmin={adminAccess?.isAdmin ?? false}
      onOpenAdmin={() => setAdminOpen(true)}
      profile={profile ?? null}
      onUpdateProfile={async (username, businessName) => { await updateProfileMutation({ username, businessName }); }}
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
      {adminOpen && adminAccess?.isAdmin ? (
        <AdminPanel
          data={adminDashboard}
          onClose={() => setAdminOpen(false)}
          onSetCardStatus={async (cardId, status) => {
            await adminSetCardStatus({ cardId, status });
            if (status === "hidden") setLayoutCards((current) => current?.filter((card) => String(card.id) !== String(cardId)) ?? current);
          }}
          onDeleteCard={async (cardId) => {
            await adminRemoveCard({ cardId });
            setLayoutCards((current) => current?.filter((card) => String(card.id) !== String(cardId)) ?? current);
          }}
          onBlockUser={async (userId) => {
            await adminBlockUser({ userId });
            setLayoutCards((current) => current?.map((card) => String(card.ownerId) === String(userId) ? { ...card, status: "hidden" } : card) ?? current);
          }}
          onUnblockUser={async (userId, restoreCards) => {
            await adminUnblockUser({ userId, restoreCards });
            if (!restoreCards) return;
            setLayoutCards(null);
          }}
          onResolveReport={async (reportId) => { await adminResolveReport({ reportId }); }}
          onSendTestEmail={async (to) => { await adminSendTestEmail({ to }); }}
        />
      ) : null}
    </>
  );
}
