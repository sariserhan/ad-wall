"use client";

import { Bug, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

type BugReason = "ui-broken" | "text-unreadable" | "not-working" | "wrong-content" | "other";

const BUG_REASONS: ReadonlyArray<{ value: BugReason; label: string; description: string }> = [
  { value: "ui-broken", label: "UI looks broken", description: "Layout, alignment, or a control is visually off" },
  { value: "text-unreadable", label: "Text unreadable", description: "Colors or contrast make text hard to read" },
  { value: "not-working", label: "Not working", description: "A button, form, or flow does nothing" },
  { value: "wrong-content", label: "Wrong content", description: "Text, data, or labels show the wrong thing" },
  { value: "other", label: "Other", description: "Something else that needs attention" },
];

export function BugReportPage({ from, onClose }: { from?: string; onClose: () => void }) {
  const reportBug = useMutation(api.bugReports.reportBug);
  const [reason, setReason] = useState<BugReason>("ui-broken");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const page = typeof from === "string" && from.trim().startsWith("/") ? from.trim() : "/";

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await reportBug({ page, reason, details: details.trim() || undefined });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-confirm-backdrop bug-report-page" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dashboard-confirm report-modal bug-report-modal nf-card support-card" role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
        <div className="nf-tape" aria-hidden="true" />
        <div className="nf-stamp" aria-hidden="true">FIX IT</div>
        <p className="nf-eyebrow bug-report-eyebrow">Support · Bug report</p>
        <Bug size={34} />
        <h3 id="bug-report-title" className="nf-headline bug-report-title">Report a bug</h3>
        {done ? (
          <>
            <p className="support-card-body bug-report-body">Thanks, we got it. We’ll review the bug and fix it where we can.</p>
            <div className="support-card-actions">
              <button className="primary" onClick={onClose}>Back to page</button>
            </div>
          </>
        ) : (
          <>
            <p className="support-card-body bug-report-body">Tell us what broke so we can fix it quickly.</p>
            <div className="report-modal-reasons" role="radiogroup" aria-label="Bug reason">
              {BUG_REASONS.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={reason === value}
                  className={`report-reason-btn${reason === value ? " selected" : ""}`}
                  onClick={() => setReason(value)}
                >
                  <strong>{label}</strong>
                  <span>{description}</span>
                </button>
              ))}
            </div>
            <label className="report-details-label">
              Page
              <span>(where this happened)</span>
              <div className="bug-report-page-path">{page}</div>
            </label>
            <label className="report-details-label">
              Additional details <span>(optional)</span>
              <textarea
                className="report-details-textarea"
                maxLength={500}
                rows={4}
                placeholder="What happened? What did you expect instead?"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
            <div className="support-card-actions">
              <button className="secondary" onClick={onClose}>Cancel</button>
              <button className="primary danger-confirm" onClick={() => void submit()} disabled={submitting}>
                {submitting ? "Sending…" : "Send bug report"}
              </button>
            </div>
          </>
        )}
        <footer className="nf-card-footer">
          <span>LocalWall</span>
          <span>report a bug</span>
        </footer>
        {/* <button className="icon-btn qr-modal-close" type="button" onClick={onClose} aria-label="Close">
          <X />
        </button> */}
      </div>
    </div>
  );
}
