"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/use-theme";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { WallApp } from "./wall-app";
import { getCardFormat, getImageCardFormat, type CardDraft, type CardUpdate, type CreateCardRateLimit, type OwnerCard, type Placement, type RenewalAmount, type SavedWall, type WallCard } from "./types";
import { buildWallPath } from "@/lib/wall-slug";
import { openAdminPanel } from "@/lib/admin-signal";
import { openDashboard } from "@/lib/dashboard-signal";
import { HOME_PATH } from "@/lib/home-path";
import { captureAnalytics, identifyAnalytics, resetAnalytics } from "@/lib/analytics";
import { ClerkAvatarMenu } from "@/components/clerk-avatar-menu";
import { toast } from "@/lib/toast";

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

export function ConnectedWallApp({
  initialCardId,
  initialLocation,
  initialKeyword,
  initialCategory,
  initialCards,
  isAdmin = false,
}: {
  initialCardId?: string;
  initialLocation?: { country: string; state: string; city: string };
  initialKeyword?: string;
  initialCategory?: string;
  initialCards?: WallCard[];
  isAdmin?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const wallPath = useMemo(() => {
    if (!pathname || pathname === "/") return null;
    const sub = searchParams.get("subcategory");
    return sub ? `${pathname}?subcategory=${encodeURIComponent(sub)}` : pathname;
  }, [pathname, searchParams]);
  const checkoutReturnPath = wallPath ?? pathname;
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, userId } = useAuth();
  const { isDark } = useTheme();
  const [layoutCards, setLayoutCards] = useState<WallCard[] | null>(null);
  const [hasAppliedInitialServerSnapshot, setHasAppliedInitialServerSnapshot] = useState(false);
  const queryCountry = initialLocation?.country || undefined;
  const queryState = initialLocation?.state || undefined;
  const queryCity = initialLocation?.city || undefined;
  const publishedCards = useQuery(api.cards.listPublished, {
    country: queryCountry,
    state: queryState,
    city: queryCity,
    ...(initialCategory && initialCategory !== "All" ? { category: initialCategory } : {}),
  }) as WallCard[] | undefined;
  const directCard = useQuery(api.cards.getPublishedById, initialCardId ? { cardId: initialCardId as Id<"cards"> } : "skip") as WallCard | null | undefined;
  const isCardPage = typeof pathname === "string" && pathname.startsWith("/card/");
  const cardWallPath = useMemo(() => {
    if (!isCardPage || !directCard?.country) return null;
    return buildWallPath(directCard.country, directCard.state ?? "", directCard.city ?? "");
  }, [isCardPage, directCard]);
  const renderCards = useMemo(() => {
    const baseCards = layoutCards ?? publishedCards ?? initialCards ?? [];
    if (!directCard || baseCards.some((card) => String(card.id) === String(directCard.id))) return baseCards;
    return [...baseCards, directCard];
  }, [directCard, layoutCards, publishedCards, initialCards]);
  const pendingCreatedCards = useMemo(() => {
    if (publishedCards === undefined || !hasAppliedInitialServerSnapshot) return [];
    const layoutIds = new Set((layoutCards ?? []).map((card) => String(card.id)));
    return publishedCards.filter((card) => !layoutIds.has(String(card.id)));
  }, [hasAppliedInitialServerSnapshot, layoutCards, publishedCards]);
  const liveCardIds = useMemo(() => renderCards.map((card) => card.id as Id<"cards">), [renderCards]);
  const liveViewCounts = useQuery(api.cards.getLiveViewCounts, liveCardIds.length === 0 ? "skip" : { cardIds: liveCardIds }) as Array<{ id: Id<"cards">; clicks: number; likes: number }> | undefined;
  const likedCardData = useQuery(api.cards.getLikedCards, isAuthenticated ? {} : "skip") as Id<"cards">[] | undefined;
  const likedCardIds = useMemo(() => new Set((likedCardData ?? []).map((id) => String(id))), [likedCardData]);
  const toggleLike = useMutation(api.cards.toggleLike).withOptimisticUpdate((localStore, args) => {
    const likedCards = localStore.getQuery(api.cards.getLikedCards, {});
    if (likedCards !== undefined) {
      const isLiked = likedCards.some((id) => id === args.cardId);
      localStore.setQuery(
        api.cards.getLikedCards,
        {},
        isLiked
          ? likedCards.filter((id) => id !== args.cardId)
          : [...likedCards, args.cardId],
      );
      const counts = localStore.getQuery(api.cards.getLiveViewCounts, { cardIds: liveCardIds });
      if (counts !== undefined) {
        localStore.setQuery(
          api.cards.getLiveViewCounts,
          { cardIds: liveCardIds },
          counts.map((item) =>
            item.id === args.cardId
              ? { ...item, likes: Math.max(0, item.likes + (isLiked ? -1 : 1)) }
              : item,
          ),
        );
      }
    }
  });
  const cards = useMemo(() => {
    if (renderCards.length === 0 && publishedCards === undefined && layoutCards === null && !initialCards?.length) return undefined;
    const statsMap = new Map((liveViewCounts ?? []).map((item) => [String(item.id), item]));
    return renderCards.map((card) => {
      const stats = statsMap.get(String(card.id));
      return { ...card, clicks: stats?.clicks ?? card.clicks ?? 0, likes: stats?.likes ?? card.likes ?? 0 };
    });
  }, [initialCards?.length, layoutCards, liveViewCounts, publishedCards, renderCards]);
  const ownerCards = useQuery(api.cards.listMine, isAuthenticated ? {} : "skip") as OwnerCard[] | undefined;
  const cardDailyStats = useQuery(api.cards.getMyCardDailyStats, isAuthenticated ? {} : "skip") as { dates: string[]; byCard: Record<string, number[]> } | null | undefined;
  const savedCards = useQuery(api.savedCards.list, isAuthenticated ? {} : "skip") as WallCard[] | undefined;
  const profile = useQuery(api.cards.getMyProfile, isAuthenticated ? {} : "skip") as { displayName: string | null; username: string | null; businessName: string | null; verified: boolean } | null | undefined;
  const updateProfileMutation = useMutation(api.cards.updateProfile);
  const generateUploadUrl = useMutation(api.cards.generateUploadUrl);
  const createCard = useMutation(api.cards.create);
  const adminCreateCard = useMutation(api.admin.playgroundCreateCard);
  const incrementCardClicks = useMutation(api.cards.incrementClicks);
  const setCardVisibility = useMutation(api.cards.setVisibility);
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  const renewCard = useMutation(api.cards.renew);
  const updateCardPosition = useMutation(api.cards.updatePosition);
  const adminSetCardStatus = useMutation(api.admin.setCardStatus);
  const adminRemoveCard = useMutation(api.admin.removeCard);
  const adminPurgeOrphanCardData = useMutation(api.admin.purgeOrphanCardData);
  const adminDeleteCardsByOwner = useMutation(api.admin.deleteAllCardsByOwner);
  const adminBlockUser = useMutation(api.admin.blockUser);
  const adminUnblockUser = useMutation(api.admin.unblockUser);
  const adminVerifyUser = useMutation(api.admin.setUserVerified);
  const adminResolveReport = useMutation(api.admin.resolveReport);
  const adminResolveBugReport = useMutation(api.admin.resolveBugReport);
  const adminResolveContactMessage = useMutation(api.admin.resolveContactMessage);
  const recordLoginEvent = useMutation(api.authEvents.recordLogin);
  const recordWallVisit = useMutation(api.walls.recordVisit);
  const effectiveWallPath = isCardPage ? cardWallPath : (pathname && pathname !== "/" ? pathname : null);
  const wallData = useQuery(api.walls.getWall, effectiveWallPath ? { path: effectiveWallPath } : "skip");
  const recordCardEvent = useMutation(api.cards.recordEvent);
  const reportCard = useMutation(api.cards.report);
  const setSavedCard = useMutation(api.savedCards.setSaved);
  const mergeLocalSavedCards = useMutation(api.savedCards.mergeLocal);
  const setSavedWall = useMutation(api.savedWalls.setSaved);
  const savedWallData = useQuery(
    api.savedWalls.isSaved,
    isAuthenticated && wallPath ? { path: wallPath } : "skip",
  ) as boolean | undefined;
  const savedWallsList = useQuery(api.savedWalls.list, isAuthenticated ? {} : "skip") as Array<{ path: string; label: string; createdAt: number }> | undefined;
  const savedWalls = useMemo<SavedWall[]>(() => {
    if (!savedWallsList) return [];
    return savedWallsList.map((item) => ({ path: item.path, label: item.label, createdAt: item.createdAt }));
  }, [savedWallsList]);
  const subscribeDigest = useMutation(api.digest.subscribe);
  const finalizePaidCard = useAction(api.payments.finalizePaidCard);
  const finalizeBundlePosting = useAction(api.payments.finalizeBundlePosting);
  const finalizeSubscriptionPosting = useAction(api.payments.finalizeSubscriptionPosting);
  const finalizePaidRenewal = useAction(api.payments.finalizePaidRenewal);
  const finalizeSubscriptionRenewal = useAction(api.payments.finalizeSubscriptionRenewal);
  const cancelAutoRenewAction = useAction(api.payments.cancelAutoRenew);
  const finalizeVerification = useAction(api.payments.finalizeVerification);
  const adminApproveVerification = useMutation(api.admin.approveVerification);
  const adminRejectVerification = useMutation(api.admin.rejectVerification);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [postAuthOpen, setPostAuthOpen] = useState(false);
  const isProcessingCheckoutRef = useRef(false);
  const ownedCardIds = useMemo(() => new Set((ownerCards ?? []).map((card) => String(card.id))), [ownerCards]);
  const currentUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const hasMergedLocalSavedCardsRef = useRef(false);
  const hasRecordedLoginEventRef = useRef<string | null>(null);

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
    if (isAuthenticated && userId) {
      identifyAnalytics(userId);
    } else if (!isAuthenticated && !isConvexAuthLoading) {
      resetAnalytics();
    }
  }, [isAuthenticated, isConvexAuthLoading, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      hasRecordedLoginEventRef.current = null;
      return;
    }
    if (hasRecordedLoginEventRef.current === userId) return;
    hasRecordedLoginEventRef.current = userId;
    void recordLoginEvent().catch(() => {});
  }, [isAuthenticated, userId, recordLoginEvent]);

  const hasRecordedCardWallRef = useRef(false);

  useEffect(() => {
    if (!pathname || pathname === "/" || isCardPage) return;
    if (sessionStorage.getItem("wall-visit-skip")) {
      sessionStorage.removeItem("wall-visit-skip");
      return;
    }
    const key = `wv:${pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void recordWallVisit({ path: pathname }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isCardPage || !cardWallPath || hasRecordedCardWallRef.current) return;
    hasRecordedCardWallRef.current = true;
    const key = `wv:${cardWallPath}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void recordWallVisit({ path: cardWallPath }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardWallPath]);

  useEffect(() => {
    if (publishedCards === undefined) return;
    if (hasAppliedInitialServerSnapshot) return;

    setLayoutCards(publishedCards);
    setHasAppliedInitialServerSnapshot(true);
  }, [hasAppliedInitialServerSnapshot, publishedCards]);

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
    if (isAuthenticated) setPostAuthOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const checkoutStatus = searchParams.get("checkout");
    if (!sessionId || !checkoutStatus) return;
    if (!isClerkLoaded || isConvexAuthLoading) return;
    if (!isAuthenticated) {
      setCheckoutMessage("Finishing sign-in with Convex…");
      return;
    }

    const processCheckout = async () => {
      const announceSuccess = (message: string) => {
        setCheckoutMessage(null);
        toast(message);
      };

      if (checkoutStatus === "canceled") {
        setCheckoutMessage("Payment canceled. No changes were made.");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (checkoutStatus !== "success") return;
      if (isProcessingCheckoutRef.current) return;

      isProcessingCheckoutRef.current = true;
      let failed = false;
      try {
        const pendingCardId = searchParams.get("pending_card_id");
        const checkoutKind = searchParams.get("kind");
        if (checkoutKind === "renewal") {
          const cardId = searchParams.get("card_id");
          if (!cardId) throw new Error("The renewal card is missing.");
          await finalizePaidRenewal({ sessionId, cardId: cardId as Id<"cards"> });
          announceSuccess("Payment succeeded and your card has been renewed.");
          return;
        }
        if (checkoutKind === "subscription_renewal") {
          const cardId = searchParams.get("card_id");
          if (!cardId) throw new Error("The renewal card is missing.");
          await finalizeSubscriptionRenewal({ sessionId, cardId: cardId as Id<"cards"> });
          announceSuccess("Payment succeeded. Your card will now auto-renew.");
          return;
        }
        if (checkoutKind === "verification") {
          await finalizeVerification({ sessionId });
          announceSuccess("Payment succeeded. Your verification request is under review — we'll approve within 24 hours.");
          return;
        }

        if (!pendingCardId) throw new Error("Could not find the pending paid card.");
        if (checkoutKind === "bundle") {
          const createdCards = await finalizeBundlePosting({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard[];
          createdCards.forEach((c) => addCardToLocalWall(c));
          announceSuccess(`Payment succeeded. Your card is now live in ${createdCards.length} cities.`);
          return;
        }
        if (checkoutKind === "subscription_posting") {
          const createdCard = await finalizeSubscriptionPosting({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard;
          addCardToLocalWall(createdCard);
          announceSuccess("Payment succeeded. Your card is on the wall and will auto-renew.");
          return;
        }
        const createdCard = await finalizePaidCard({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard;
        addCardToLocalWall(createdCard);
        announceSuccess("Payment succeeded and your card is now on the wall.");
      } catch (cause) {
        failed = true;
        setCheckoutMessage(cause instanceof Error ? cause.message : "Payment could not be finalized. Refresh the page to try again.");
      } finally {
        isProcessingCheckoutRef.current = false;
        if (!failed) window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    processCheckout();
  }, [searchParams, isAuthenticated, isClerkLoaded, isConvexAuthLoading, finalizePaidCard, finalizePaidRenewal, finalizeBundlePosting, finalizeSubscriptionPosting, finalizeSubscriptionRenewal, finalizeVerification, addCardToLocalWall]);

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
    const uploadedBackImages = await Promise.all(draft.backFiles.slice(0, 1).map(uploadImageVariants));
    const imageIds = uploadedImages.map((image) => image.imageId);
    const thumbnailImageIds = uploadedImages.map((image) => image.thumbnailImageId);
    const backImageIds = uploadedBackImages.map((image) => image.imageId);
    const backThumbnailImageIds = uploadedBackImages.map((image) => image.thumbnailImageId);
    const isBundle = draft.paymentOption === "bundle";
    const basePaidAmount = isBundle ? 19.99 : draft.paymentOption === "free" ? 0 : Number(draft.paymentOption);
    const featuredPrices: Record<string, number> = { boost: 2.99, bronze: 2.99, silver: 4.99, gold: 9.99 };
    const featuredPaidAmount = !isBundle && draft.featuredTier && draft.featuredTier !== "none" ? (featuredPrices[draft.featuredTier] ?? 0) : 0;
    const bypassPayment = Boolean(draft.bypassPayment && isAdmin && !isBundle);
    const totalPaidAmount = bypassPayment ? 0 : basePaidAmount + featuredPaidAmount;
    const featuredTierArg = !isBundle && draft.featuredTier && draft.featuredTier !== "none" ? draft.featuredTier : undefined;
    const primaryCity = isBundle && draft.bundleCities?.[0]
      ? draft.bundleCities[0]
      : { city: draft.city || initialLocation?.city || "", state: draft.state || initialLocation?.state || "", country: draft.country || initialLocation?.country || "" };
    const cardPayload = {
      name: draft.name,
      category: draft.category,
      subcategory: draft.subcategory,
      line: draft.line,
      message: draft.message,
      area: draft.area,
      city: primaryCity.city,
      state: primaryCity.state,
      country: primaryCity.country,
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
      whatsapp: draft.whatsapp,
      telegram: draft.telegram,
      paidAmount: basePaidAmount,
      featuredTier: featuredTierArg,
      bypassPayment: bypassPayment ? true : undefined,
      theme: draft.theme,
      imageMode: draft.imageMode,
      cardShape: draft.cardShape,
      imageX: draft.imageX,
      imageY: draft.imageY,
      imageWidth: draft.imageWidth,
      imageHeight: draft.imageHeight,
      backImageX: draft.backImageX,
      backImageY: draft.backImageY,
      backImageScale: draft.backImageScale,
      imageIds,
      thumbnailImageIds,
      backImageIds,
      backThumbnailImageIds,
      x: placement.x,
      y: placement.y,
      rotation: draft.rotation ?? 0,
      width: draft.imageMode === "business-card" ? getCardFormat("biz", draft.cardShape).width : getImageCardFormat(draft.theme, draft.imageMode).width,
    };
    if (bypassPayment) {
      const createdResult = await adminCreateCard({ ...cardPayload, bypassPayment: true }) as { card: WallCard };
      const createdCard = createdResult.card;
      addCardToLocalWall(createdCard);
      captureAnalytics("card_created", {
        card_name: draft.name,
        category: draft.category,
        theme: draft.theme,
        location_country: draft.country,
        location_state: draft.state,
        location_city: draft.city,
      });
      return createdCard;
    }
    const result = await createCard(cardPayload) as WallCard | { pendingCardId: Id<"pendingCards"> } | CreateCardRateLimit;
    if ("kind" in result && result.kind === "rate_limited") {
      setCheckoutMessage(result.message);
      return;
    }
    if (totalPaidAmount > 0) {
      if (!("pendingCardId" in result)) throw new Error("The paid card could not be prepared.");
      const checkoutBody = isBundle
        ? { bundlePayload: { pendingCardId: result.pendingCardId, bundleCities: draft.bundleCities, cardName: draft.name }, returnPath: checkoutReturnPath }
        : { pendingCardId: result.pendingCardId, paidAmount: totalPaidAmount, cardName: draft.name, autoRenew: draft.autoRenew, returnPath: checkoutReturnPath };
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutBody),
      });
      const checkoutResult = await response.json() as { url?: string; sessionId?: string; error?: string };
      if (!response.ok || !checkoutResult.url || !checkoutResult.sessionId) throw new Error(checkoutResult.error || "Could not start card checkout.");
      captureAnalytics("card_checkout_started", {
        card_name: draft.name,
        category: draft.category,
        payment_option: draft.paymentOption,
        featured_tier: draft.featuredTier,
        amount: totalPaidAmount,
        is_bundle: isBundle,
        auto_renew: draft.autoRenew ?? false,
        location_country: draft.country,
        location_state: draft.state,
        location_city: draft.city,
      });
      window.location.assign(checkoutResult.url);
      return;
    }
    const card = result as WallCard;
    addCardToLocalWall(card);
    captureAnalytics("card_created", {
      card_name: draft.name,
      category: draft.category,
      theme: draft.theme,
      location_country: draft.country,
      location_state: draft.state,
      location_city: draft.city,
    });
    return card;
  };

  const handleRenew = async (card: OwnerCard, paidAmount: RenewalAmount, autoRenew: boolean = false) => {
    if (paidAmount === 0) {
      await renewCard({ cardId: card.id as Id<"cards">, paidAmount });
      setCheckoutMessage(`${card.name} was renewed for 1 day.`);
      return;
    }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalPayload: { cardId: String(card.id), cardName: card.name, paidAmount, autoRenew }, returnPath: checkoutReturnPath }),
      });
    const result = await response.json() as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error || "Could not start renewal checkout.");
    window.location.assign(result.url);
  };

  const handleCancelAutoRenew = async (card: OwnerCard) => {
    await cancelAutoRenewAction({ cardId: card.id as Id<"cards"> });
    setCheckoutMessage(`Auto-renew canceled for ${card.name}.`);
  };

  return (
    <>
      <WallApp
      mode="connected"
      cards={cards}
      wallViewCount={wallData?.viewCount}
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
        setPostAuthOpen(true);
      }}
      onCreateCard={handleCreate}
      onCardOpen={(card) => {
        if (!card.id.toString().startsWith("demo-")) {
          incrementCardClicks({ cardId: card.id as any });
        }
      }}
      onCardEvent={(card, event) => {
        if (!String(card.id).startsWith("demo-")) void recordCardEvent({ cardId: card.id as Id<"cards">, event });
      }}
      onReportCard={async (card, reason, details) => {
        await reportCard({ cardId: card.id as Id<"cards">, reason, details });
      }}
      authControl={isClerkSignedIn ? (
        <ClerkAvatarMenu
          isDark={isDark}
          profile={profile}
          isReady={profile !== undefined}
          onUpdateBusinessName={async (businessName) => { await updateProfileMutation({ businessName }); }}
          onOpenHome={() => router.push(HOME_PATH)}
          onOpenAdminPanel={() => openAdminPanel()}
          onOpenAdminWall={() => router.push("/admin/wall")}
          onOpenDashboard={() => openDashboard()}
          onOpenTrending={() => router.push("/trending")}
          onOpenBilling={() => router.push("/billing")}
          isAdmin={isAdmin}
        />
      ) : null}
      notice={checkoutMessage}
      ownerCards={isAuthenticated ? (ownerCards ?? []) : undefined}
      savedCards={isAuthenticated ? (savedCards ?? []) : []}
      initialCardId={initialCardId}
      initialLocation={initialLocation}
      initialKeyword={initialKeyword}
      initialCategory={initialCategory}
      onSetSavedCard={async (card, saved) => {
        await setSavedCard({ cardId: card.id as Id<"cards">, saved });
        captureAnalytics("card_saved", {
          card_name: card.name,
          category: card.category,
          saved,
          location_country: card.country,
          location_state: card.state,
          location_city: card.city,
        });
      }}
      savedWall={savedWallData ?? false}
      onSetSavedWall={async (label, saved) => {
        if (!wallPath) return;
        await setSavedWall({ path: wallPath, label, saved });
        captureAnalytics("wall_saved", { wall_label: label, wall_path: wallPath, saved });
      }}
      savedWalls={savedWalls}
      onRemoveSavedWall={async (wall) => {
        await setSavedWall({ path: wall.path, label: wall.label, saved: false });
      }}
      ownedCardIds={ownedCardIds}
      likedCardIds={likedCardIds}
      onToggleLike={isAuthenticated ? async (card) => {
        const isLiked = likedCardIds.has(String(card.id));
        void toggleLike({ cardId: card.id as Id<"cards"> });
        captureAnalytics("card_liked", {
          card_name: card.name,
          category: card.category,
          liked: !isLiked,
          location_country: card.country,
          location_state: card.state,
          location_city: card.city,
        });
      } : undefined}
      profile={null}
      cardDailyStats={cardDailyStats ?? null}
      allowPaymentBypass={isAdmin}
      onRequestVerification={isAuthenticated ? async (plan) => {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationPayload: { plan }, returnPath: checkoutReturnPath }),
        });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || "Could not start verification checkout.");
        window.location.assign(result.url);
      } : undefined}
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
      onCancelAutoRenewCard={handleCancelAutoRenew}
      onSubscribeDigest={async (email, country, state, city) => subscribeDigest({ email, country, state, city })}
      onMoveCard={async (card, placement) => {
        await updateCardPosition({ cardId: card.id as Id<"cards">, x: placement.x, y: placement.y, rotation: placement.rotation });
        setLayoutCards((current) => current?.map((item) => String(item.id) === String(card.id) ? { ...item, ...placement, positionLockedAt: Date.now() } : item) ?? current);
      }}
      />
      {postAuthOpen ? (
        <div
          className="post-auth-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPostAuthOpen(false);
          }}
        >
          <div className="nf-card post-auth-card" role="dialog" aria-modal="true" aria-labelledby="post-auth-title">
            <div className="nf-tape" aria-hidden="true" />
            <div className="nf-stamp" aria-hidden="true">SIGN IN</div>

            <p className="nf-eyebrow">Notice · LocalWall access</p>
            <h2 className="nf-headline" id="post-auth-title">Sign in to LocalWall</h2>
            <p className="nf-body">Sign in to post and manage your local listings</p>

            <div className="sign-in-panel post-auth-panel">
              <SignIn routing="hash" withSignUp signUpUrl="/sign-up" forceRedirectUrl={currentUrl} fallbackRedirectUrl={currentUrl} />
            </div>

            <p className="post-auth-signup">
              Don&apos;t have an account yet? <Link href="/sign-up">Sign up</Link>
            </p>

            <footer className="nf-card-footer">
              <span>LocalWall</span>
              <span>your local bulletin board</span>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
