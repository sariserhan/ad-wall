"use client";

import { Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";

type ClerkContactUser = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  primaryPhoneNumber?: { phoneNumber?: string | null } | null;
  phoneNumbers?: Array<{ phoneNumber?: string | null }>;
};

export function ContactPage({ from, onClose }: { from?: string; onClose: () => void }) {
  const sendContactMessage = useMutation(api.contactMessages.sendContactMessage);
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const profile = useQuery(api.cards.getMyProfile, isAuthenticated ? {} : "skip") as {
    displayName: string | null;
    username: string | null;
    businessName: string | null;
    verified: boolean;
    verificationStatus: "pending" | "approved" | "rejected" | null;
  } | null | undefined;
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const page = typeof from === "string" && from.trim().startsWith("/") ? from.trim() : "/";
  const clerkUser = user as ClerkContactUser | null | undefined;
  const fallbackName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ");
  const displayName = profile?.displayName ?? clerkUser?.fullName ?? (fallbackName || undefined);
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? undefined;
  const phone = clerkUser?.primaryPhoneNumber?.phoneNumber ?? clerkUser?.phoneNumbers?.[0]?.phoneNumber ?? undefined;
  const contactSummary = [
    displayName ? `Name: ${displayName}` : null,
    profile?.username ? `Username: @${profile.username}` : null,
    profile?.businessName ? `Business: ${profile.businessName}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await sendContactMessage({
        page,
        topic,
        message,
        reporterDisplayName: displayName,
        reporterUsername: profile?.username ?? clerkUser?.username ?? undefined,
        reporterEmail: email,
        reporterBusinessName: profile?.businessName ?? undefined,
        reporterPhone: phone,
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-confirm-backdrop bug-report-page contact-page" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dashboard-confirm report-modal bug-report-modal contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <Mail size={34} />
        <h3 id="contact-title">Contact</h3>
        {done ? (
          <>
            <p style={{ textAlign: "center" }}>Thanks, your message is in. We will see it in the contact inbox.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
              <button style={{ width: "50%", margin: "auto", padding: "0.5rem 1rem" }} className="primary" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ textAlign: "center" }}>Tell us what you need. Keep it short or long, we’ll save the full message for review.</p>
            <label className="report-details-label">
              Topic
              <span>(what is this about?)</span>
              <input
                className="contact-topic-input"
                maxLength={120}
                placeholder="Billing, bug, feature request, account help..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <div className="contact-details-summary" aria-label="Attached account details">
              <strong>Attached automatically</strong>
              <p>We include whatever account details are available so we can respond faster.</p>
              <div className="contact-details-list">
                {contactSummary.length ? contactSummary.map((item) => <span key={item}>{item}</span>) : <span>No profile details are available yet.</span>}
              </div>
            </div>
            <label className="report-details-label">
              Message
              <span>(tell us anything you want)</span>
              <textarea
                className="report-details-textarea contact-message-textarea"
                maxLength={1000}
                rows={5}
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <label className="report-details-label">
              Page
              <span>(where you opened this from)</span>
              <div className="bug-report-page-path">{page}</div>
            </label>
            <div>
              <button className="secondary" onClick={onClose}>Cancel</button>
              <button className="primary danger-confirm" onClick={() => void submit()} disabled={submitting}>
                {submitting ? "Sending…" : "Send message"}
              </button>
            </div>
          </>
        )}
        <button className="icon-btn qr-modal-close" type="button" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </div>
    </div>
  );
}
