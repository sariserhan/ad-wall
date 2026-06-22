"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function Stars({ rating, interactive, onPick }: { rating: number; interactive?: boolean; onPick?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const lit = hovered || rating;
  return (
    <span className={`review-stars${interactive ? " review-stars-pick" : ""}`} aria-label={interactive ? "Select rating" : `${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= lit ? "star-on" : "star-off"}
          aria-hidden={!interactive}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={() => interactive && onPick?.(s)}
          onMouseEnter={() => interactive && setHovered(s)}
          onMouseLeave={() => interactive && setHovered(0)}
          onKeyDown={(e) => interactive && (e.key === "Enter" || e.key === " ") && onPick?.(s)}
        >★</span>
      ))}
    </span>
  );
}

export function ReviewsSection({ cardId, onRequestSignIn }: {
  cardId: string | Id<"cards">;
  onRequestSignIn?: () => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const cid = cardId as Id<"cards">;

  const data = useQuery(api.reviews.listForCard, { cardId: cid });
  const reviews = data?.reviews;
  const isCardOwner = data?.isCardOwner ?? false;
  const myReview = useQuery(api.reviews.getMyReview, isAuthenticated ? { cardId: cid } : "skip");
  const upsertReview = useMutation(api.reviews.upsert);
  const removeReview = useMutation(api.reviews.remove);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (myReview && !editing) {
      setRating(myReview.rating);
      setText(myReview.text ?? "");
    }
    if (!myReview) {
      setRating(0);
      setText("");
    }
  }, [myReview, editing]);

  const enterEdit = () => {
    if (myReview) { setRating(myReview.rating); setText(myReview.text ?? ""); }
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
    if (myReview) { setRating(myReview.rating); setText(myReview.text ?? ""); }
    else { setRating(0); setText(""); }
  };

  const submit = async () => {
    if (rating === 0) { setError("Please choose a star rating."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await upsertReview({ cardId: cid, rating, text: text.trim() || undefined });
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save review.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMyReview = async () => {
    setSubmitting(true);
    try {
      await removeReview({ cardId: cid });
      setRating(0);
      setText("");
      setEditing(false);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const count = reviews?.length ?? 0;
  const avg = count > 0 ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0;
  const avgDisplay = avg > 0 ? avg.toFixed(1) : null;

  const showForm = isAuthenticated && !isCardOwner && (!myReview || editing);

  return (
    <section className="reviews-section" aria-label="Reviews">
      <div className="reviews-header">
        <strong>Reviews</strong>
        {count > 0 ? (
          <span className="reviews-summary">
            <Stars rating={Math.round(avg)} />
            <span>{avgDisplay} · {count} review{count !== 1 ? "s" : ""}</span>
          </span>
        ) : (
          <span className="reviews-empty-label">No reviews yet</span>
        )}
      </div>

      {/* My existing review (view mode) */}
      {isAuthenticated && myReview && !editing ? (
        <div className="review-mine">
          <div className="review-mine-top">
            <Stars rating={myReview.rating} />
            <span className="review-own-label">Your review</span>
            <button className="review-action-btn" onClick={enterEdit} aria-label="Edit review" disabled={submitting}><Pencil size={12} /></button>
            <button className="review-action-btn review-action-delete" onClick={() => void deleteMyReview()} aria-label="Delete review" disabled={submitting}><Trash2 size={12} /></button>
          </div>
          {myReview.text ? <p className="review-text">{myReview.text}</p> : null}
        </div>
      ) : null}

      {/* Review form */}
      {showForm ? (
        <div className="review-form">
          <p className="review-form-label">{myReview ? "Edit your review" : "Write a review"}</p>
          <Stars rating={rating} interactive onPick={setRating} />
          <textarea
            className="review-textarea"
            placeholder="What did you think? (optional)"
            maxLength={500}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error ? <p className="review-error">{error}</p> : null}
          <div className="review-form-actions">
            {myReview ? <button className="secondary" onClick={cancelEdit} disabled={submitting}>Cancel</button> : null}
            <button className="primary" onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Card owner notice */}
      {isAuthenticated && isCardOwner ? (
        <p className="review-owner-notice">You cannot review your own card.</p>
      ) : null}

      {/* Sign-in prompt */}
      {!isAuthenticated ? (
        <button className="review-sign-in-prompt" onClick={onRequestSignIn}>
          Sign in to leave a review
        </button>
      ) : null}

      {/* Review list (others' reviews) */}
      {reviews && reviews.filter((r) => !r.isOwn).length > 0 ? (
        <ul className="reviews-list">
          {reviews.filter((r) => !r.isOwn).map((review) => (
            <li key={String(review.id)} className="review-item">
              <div className="review-item-top">
                <Stars rating={review.rating} />
                <span className="review-author">{review.reviewerName ?? "Anonymous"}</span>
                <span className="review-date">{relativeTime(review.createdAt)}</span>
              </div>
              {review.text ? <p className="review-text">{review.text}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
