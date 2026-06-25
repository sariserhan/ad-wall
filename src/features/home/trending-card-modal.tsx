"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { WallCard } from "@/features/wall/types";

const DetailPanel = dynamic(
  () => import("@/features/wall/detail-panel").then((m) => ({ default: m.DetailPanel })),
  { ssr: false, loading: () => null },
);

interface Props {
  cardId: string;
  onClose: () => void;
}

export function TrendingCardModal({ cardId, onClose }: Props) {
  const card = useQuery(api.cards.getPublishedById, { cardId: cardId as Id<"cards"> });
  const recordEvent = useMutation(api.cards.recordEvent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="tc-modal-backdrop" onClick={onClose} />
      {card && (
        <DetailPanel
          card={card as unknown as WallCard}
          onClose={onClose}
          viewCount={card.clicks ?? 0}
          onEvent={(event) => void recordEvent({ cardId: cardId as Id<"cards">, event })}
          canSaveCard={false}
        />
      )}
    </>
  );
}
