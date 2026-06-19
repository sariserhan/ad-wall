"use client";

import { UserButton, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { WallApp } from "./wall-app";
import type { CardDraft, Placement, WallCard, CardCategory, CardTheme } from "./types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ConnectedWallApp() {
  const cards = useQuery(api.cards.listPublished) as WallCard[] | undefined;
  const generateUploadUrl = useMutation(api.cards.generateUploadUrl);
  const createCard = useMutation(api.cards.create);
  const incrementCardClicks = useMutation(api.cards.incrementClicks);
  const { isAuthenticated } = useConvexAuth();
  const { openSignIn } = useClerk();
  const searchParams = useSearchParams();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const checkoutStatus = searchParams.get("checkout");
    if (!sessionId || !checkoutStatus) return;

    const processCheckout = async () => {
      if (checkoutStatus === "canceled") {
        setCheckoutMessage("Payment canceled. Your draft was not posted.");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (checkoutStatus !== "success") return;
      if (isProcessingCheckout) return;

      setIsProcessingCheckout(true);
      try {
        const verify = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`);
        if (!verify.ok) throw new Error("Unable to verify Stripe session.");
        const verified = await verify.json();
        if (!verified.success) throw new Error(verified.error || "Payment verification failed.");

        const stored = window.localStorage.getItem(`stripe-checkout-draft-${sessionId}`);
        if (!stored) throw new Error("Could not find the card draft for this payment.");

        const cardPayload = JSON.parse(stored) as {
          name: string;
          category: CardCategory;
          line: string;
          area: string;
          city?: string;
          state?: string;
          country?: string;
          zipcode?: string;
          price?: string;
          paidAmount: number;
          theme: CardTheme;
          imageIds: Id<"_storage">[];
          x: number;
          y: number;
          rotation: number;
          width: number;
        };

        await createCard({
          name: cardPayload.name,
          category: cardPayload.category,
          line: cardPayload.line,
          area: cardPayload.area,
          city: cardPayload.city ?? "",
          state: cardPayload.state ?? "",
          country: cardPayload.country ?? "",
          zipcode: cardPayload.zipcode,
          price: cardPayload.price,
          paidAmount: cardPayload.paidAmount,
          theme: cardPayload.theme,
          imageIds: cardPayload.imageIds,
          x: cardPayload.x,
          y: cardPayload.y,
          rotation: cardPayload.rotation,
          width: cardPayload.width,
        });
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
  }, [searchParams, isProcessingCheckout, createCard]);

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

  const handleCreate = async (draft: CardDraft, placement: Placement): Promise<WallCard> => {
    const imageIds = await Promise.all(draft.files.slice(0, 2).map(uploadImage));
    const paidAmount = draft.paymentOption === "free" ? 0 : Number(draft.paymentOption);
    const card = await createCard({
      name: draft.name,
      category: draft.category,
      line: draft.line,
      area: draft.area,
      city: draft.city,
      state: draft.state,
      country: draft.country,
      zipcode: draft.zipcode,
      price: draft.price,
      paidAmount,
      theme: draft.theme,
      imageIds,
      x: placement.x,
      y: placement.y,
      rotation: -3 + Math.random() * 6,
      width: 220,
    }) as WallCard;
    return card;
  };

  return (
    <WallApp
      mode="connected"
      cards={cards}
      isLoading={cards === undefined}
      isSignedIn={isAuthenticated}
      onRequestSignIn={() => openSignIn()}
      onCreateCard={handleCreate}
      onCardOpen={(card) => {
        if (!card.id.toString().startsWith("demo-")) {
          incrementCardClicks({ cardId: card.id as any });
        }
      }}
      authControl={isAuthenticated ? <UserButton /> : null}
      notice={checkoutMessage}
    />
  );
}
