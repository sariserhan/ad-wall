"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Download, LayoutDashboard, TrendingUp } from "lucide-react";
import { ClerkMyDataPage } from "./clerk-my-data-page";
import { useTheme } from "@/lib/use-theme";
import { getClerkUserButtonAppearance, getClerkUserProfileAppearance } from "@/lib/clerk-appearance";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import dynamic from "next/dynamic";
import type { AdminDashboardData } from "./admin-panel";
import { WallApp } from "./wall-app";

const AdminPanel = dynamic(() => import("./admin-panel").then((m) => ({ default: m.AdminPanel })), { ssr: false, loading: () => null });
import { getCardFormat, type CardDraft, type CardUpdate, type OwnerCard, type Placement, type RenewalAmount, type SavedWall, type WallCard } from "./types";
import { buildWallPath } from "@/lib/wall-slug";
import posthog from "posthog-js";
import { openDashboard } from "@/lib/dashboard-signal";

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
}: {
  initialCardId?: string;
  initialLocation?: { country: string; state: string; city: string };
  initialKeyword?: string;
  initialCategory?: string;
  initialCards?: WallCard[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const wallPath = useMemo(() => {
    if (!pathname || pathname === "/") return null;
    const sub = searchParams.get("subcategory");
    return sub ? `${pathname}?subcategory=${encodeURIComponent(sub)}` : pathname;
  }, [pathname, searchParams]);
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, userId } = useAuth();
  const { isDark } = useTheme();
  const [layoutCards, setLayoutCards] = useState<WallCard[] | null>(null);
  const [hasAppliedInitialServerSnapshot, setHasAppliedInitialServerSnapshot] = useState(false);
  const queryCountry = initialLocation?.country || undefined;
  const queryState = initialLocation?.state || undefined;
  const queryCity = initialLocation?.city || undefined;
  const [activeCategory, setActiveCategory] = useState(initialCategory && initialCategory !== "All" ? initialCategory : undefined);
  const publishedCards = useQuery(api.cards.listPublished, {
    country: queryCountry,
    state: queryState,
    city: queryCity,
    ...(activeCategory ? { category: activeCategory } : {}),
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
  const adminAccess = useQuery(api.admin.getAccess, isAuthenticated ? {} : "skip") as { isAdmin: boolean } | undefined;
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    if (!adminOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const block = (e: WheelEvent | TouchEvent) => {
      let el = e.target as HTMLElement | null;
      while (el) {
        if (el !== document.documentElement && el !== document.body && el.scrollHeight > el.clientHeight) return;
        el = el.parentElement;
      }
      e.preventDefault();
    };
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = "";
      document.removeEventListener("wheel", block);
      document.removeEventListener("touchmove", block);
    };
  }, [adminOpen]);

  const adminDashboard = useQuery(api.admin.getDashboard, adminOpen && adminAccess?.isAdmin ? {} : "skip") as AdminDashboardData | undefined;
  const profile = useQuery(api.cards.getMyProfile, isAuthenticated ? {} : "skip") as { displayName: string | null; username: string | null; businessName: string | null; verified: boolean; verificationStatus: "pending" | "approved" | "rejected" | null } | null | undefined;
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
  const adminVerifyUser = useMutation(api.admin.setUserVerified);
  const adminResolveReport = useMutation(api.admin.resolveReport);
  const adminResolveBugReport = useMutation(api.admin.resolveBugReport);
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
  const { openSignUp } = useClerk();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const isProcessingCheckoutRef = useRef(false);
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
    if (isAuthenticated && userId) {
      posthog.identify(userId);
    } else if (!isAuthenticated && !isConvexAuthLoading) {
      posthog.reset();
    }
  }, [isAuthenticated, isConvexAuthLoading, userId]);

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
          setCheckoutMessage("Payment succeeded and your card has been renewed.");
          return;
        }
        if (checkoutKind === "subscription_renewal") {
          const cardId = searchParams.get("card_id");
          if (!cardId) throw new Error("The renewal card is missing.");
          await finalizeSubscriptionRenewal({ sessionId, cardId: cardId as Id<"cards"> });
          setCheckoutMessage("Payment succeeded. Your card will now auto-renew.");
          return;
        }
        if (checkoutKind === "verification") {
          await finalizeVerification({ sessionId });
          setCheckoutMessage("Payment succeeded. Your verification request is under review — we'll approve within 24 hours.");
          return;
        }

        if (!pendingCardId) throw new Error("Could not find the pending paid card.");
        if (checkoutKind === "bundle") {
          const createdCards = await finalizeBundlePosting({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard[];
          createdCards.forEach((c) => addCardToLocalWall(c));
          setCheckoutMessage(`Payment succeeded. Your card is now live in ${createdCards.length} cities.`);
          return;
        }
        if (checkoutKind === "subscription_posting") {
          const createdCard = await finalizeSubscriptionPosting({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard;
          addCardToLocalWall(createdCard);
          setCheckoutMessage("Payment succeeded. Your card is on the wall and will auto-renew.");
          return;
        }
        const createdCard = await finalizePaidCard({ sessionId, pendingCardId: pendingCardId as Id<"pendingCards"> }) as WallCard;
        addCardToLocalWall(createdCard);
        setCheckoutMessage("Payment succeeded and your card is now on the wall.");
      } catch (cause) {
        failed = true;
        setCheckoutMessage(cause instanceof Error ? cause.message : "Payment could not be finalized. Refresh the page to try again.");
      } finally {
        isProcessingCheckoutRef.current = false;
        if (!failed) window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    processCheckout();
  }, [searchParams, finalizePaidCard, finalizePaidRenewal, finalizeBundlePosting, finalizeSubscriptionPosting, finalizeSubscriptionRenewal, finalizeVerification, addCardToLocalWall]);

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
    const isBundle = draft.paymentOption === "bundle";
    const basePaidAmount = isBundle ? 19.99 : draft.paymentOption === "free" ? 0 : Number(draft.paymentOption);
    const featuredPrices: Record<string, number> = { bronze: 2.99, silver: 4.99, gold: 9.99 };
    const featuredPaidAmount = !isBundle && draft.featuredTier && draft.featuredTier !== "none" ? (featuredPrices[draft.featuredTier] ?? 0) : 0;
    const totalPaidAmount = basePaidAmount + featuredPaidAmount;
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
      theme: draft.theme,
      imageMode: draft.imageMode,
      imageX: draft.imageX,
      imageY: draft.imageY,
      imageWidth: draft.imageWidth,
      imageIds,
      thumbnailImageIds,
      x: placement.x,
      y: placement.y,
      rotation: draft.rotation ?? 0,
      width: getCardFormat(draft.imageMode === "business-card" ? "biz" : draft.theme).width,
    };
    const result = await createCard(cardPayload) as WallCard | { pendingCardId: Id<"pendingCards"> };
    if (totalPaidAmount > 0) {
      if (!("pendingCardId" in result)) throw new Error("The paid card could not be prepared.");
      const checkoutBody = isBundle
        ? { bundlePayload: { pendingCardId: result.pendingCardId, bundleCities: draft.bundleCities, cardName: draft.name } }
        : { pendingCardId: result.pendingCardId, paidAmount: totalPaidAmount, cardName: draft.name, autoRenew: draft.autoRenew };
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutBody),
      });
      const checkoutResult = await response.json() as { url?: string; sessionId?: string; error?: string };
      if (!response.ok || !checkoutResult.url || !checkoutResult.sessionId) throw new Error(checkoutResult.error || "Could not start card checkout.");
      posthog.capture("card_checkout_started", {
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
    posthog.capture("card_created", {
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
      body: JSON.stringify({ renewalPayload: { cardId: String(card.id), cardName: card.name, paidAmount, autoRenew } }),
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
        void openSignUp();
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
        <UserButton appearance={getClerkUserButtonAppearance(isDark)} userProfileProps={{ appearance: getClerkUserProfileAppearance(isDark) }}>
          <UserButton.UserProfilePage label="My data" url="my-data" labelIcon={<Download size={16} />}>
            <ClerkMyDataPage />
          </UserButton.UserProfilePage>
          <UserButton.MenuItems>
            <UserButton.Action
              label="My board"
              labelIcon={<LayoutDashboard size={16} />}
              onClick={() => openDashboard()}
            />
            <UserButton.Action
              label="Trending"
              labelIcon={<TrendingUp size={16} />}
              onClick={() => router.push("/trending")}
            />
              <UserButton.Action
                label="Manage billing"
                labelIcon={<CreditCard size={16} />}
                onClick={() => router.push("/billing")}
              />
              <UserButton.Action label="manageAccount" />
              <UserButton.Action label="signOut" />
            </UserButton.MenuItems>
          </UserButton>
      ) : null}
      notice={checkoutMessage}
      ownerCards={isAuthenticated ? (ownerCards ?? []) : undefined}
      savedCards={isAuthenticated ? (savedCards ?? []) : []}
      initialCardId={initialCardId}
      initialLocation={initialLocation}
      initialKeyword={initialKeyword}
      initialCategory={initialCategory}
      onCategoryChange={(cat) => setActiveCategory(cat === "All" ? undefined : cat)}
      onSetSavedCard={async (card, saved) => {
        await setSavedCard({ cardId: card.id as Id<"cards">, saved });
        posthog.capture("card_saved", {
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
        posthog.capture("wall_saved", { wall_label: label, wall_path: wallPath, saved });
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
        posthog.capture("card_liked", {
          card_name: card.name,
          category: card.category,
          liked: !isLiked,
          location_country: card.country,
          location_state: card.state,
          location_city: card.city,
        });
      } : undefined}
      isAdmin={adminAccess?.isAdmin ?? false}
      onOpenAdmin={() => setAdminOpen(true)}
      profile={profile ?? null}
      onUpdateProfile={async (username, businessName) => { await updateProfileMutation({ username, businessName }); }}
      cardDailyStats={cardDailyStats ?? null}
      onRequestVerification={isAuthenticated ? async (plan) => {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationPayload: { plan } }),
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
          onVerifyUser={async (userId, verified) => { await adminVerifyUser({ userId, verified }); }}
          onResolveReport={async (reportId) => { await adminResolveReport({ reportId }); }}
          onResolveBugReport={async (bugReportId) => { await adminResolveBugReport({ bugReportId }); }}
          onApproveVerification={async (requestId) => { await adminApproveVerification({ requestId }); }}
          onRejectVerification={async (requestId) => { await adminRejectVerification({ requestId }); }}
        />
      ) : null}
    </>
  );
}
