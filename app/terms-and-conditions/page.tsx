import type { Metadata } from "next";
import Link from "next/link";
import { PrivacySettingsLink } from "@/components/privacy-settings-link";

export const metadata: Metadata = {
  title: "Terms & Conditions | WALL",
  description: "Terms and conditions for using WALL.",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__hero">
        <p className="legal-page__eyebrow">WALL legal</p>
        <h1>Terms & Conditions</h1>
        <p className="legal-page__intro">
          These terms govern access to and use of WALL, including browsing local ads, posting cards, and interacting with content on the platform.
        </p>
        <div className="legal-page__actions">
          <Link href="/" className="legal-page__back-link">Back to localwall</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <PrivacySettingsLink className="legal-page__privacy-settings" variant="text" />
        </div>
      </div>

      <div className="legal-page__body">
        <section>
          <h2>1. Using WALL</h2>
          <p>WALL is a community advertising platform for local services, businesses, creators, and neighborhood notices. You may use the service only in compliance with applicable laws and only for legitimate commercial or community purposes.</p>
        </section>
        <section>
          <h2>2. Account responsibility</h2>
          <p>If you create or manage cards through an account, you are responsible for the accuracy of your information, the security of your sign-in method, and all activity carried out under your account.</p>
        </section>
        <section>
          <h2>3. User content</h2>
          <p>You retain responsibility for the text, images, links, pricing, and contact details you publish. By posting a card, you represent that you have the right to share the content and that it does not infringe any third-party rights.</p>
        </section>
        <section>
          <h2>4. Support and contact forms</h2>
          <p>If you send a message through the support or contact tools, you agree that WALL may store the message, page context, and any available account details so an administrator can review it and respond. We may use those messages for moderation, troubleshooting, and account support.</p>
        </section>
        <section>
          <h2>5. Analytics and cookies</h2>
          <p>WALL may ask for consent before enabling analytics cookies. If you accept, we may collect usage analytics to improve the service. You can decline the prompt, and you may also control cookies or local storage in your browser settings.</p>
        </section>
        <section>
          <h2>6. Prohibited content</h2>
          <p>You may not use WALL to post unlawful, deceptive, fraudulent, harassing, adult, hateful, violent, or misleading material. We may remove cards or restrict access where content appears unsafe, abusive, spammy, or inconsistent with the intended local-ad use of the service.</p>
        </section>
        <section>
          <h2>7. Payments and renewals</h2>
          <p>Some posting or renewal options may require payment. Pricing, placement duration, and renewal options are shown during checkout. Payments are processed through third-party providers, and you are responsible for reviewing those providers&apos; own terms and policies.</p>
        </section>
        <section>
          <h2>8. Availability</h2>
          <p>We may update, suspend, or discontinue features at any time. We do not guarantee uninterrupted availability, permanent storage of content, or that every card will remain visible for a specific period except where explicitly stated at purchase.</p>
        </section>
        <section>
          <h2>9. Moderation and enforcement</h2>
          <p>We may review reported or flagged content and may hide, remove, or limit cards that violate these terms, create risk for users, or expose the platform to legal or operational harm.</p>
        </section>
        <section>
          <h2>10. Disclaimer</h2>
          <p>WALL is provided on an as-is and as-available basis. We do not guarantee the accuracy of user-posted information, the quality of advertised services, or the identity of people interacting with cards on the platform.</p>
        </section>
        <section>
          <h2>11. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, WALL and its operators are not liable for indirect, incidental, special, consequential, or business-interruption damages arising from use of the platform, user content, transactions, or reliance on posted information.</p>
        </section>
        <section>
          <h2>12. Changes to these terms</h2>
          <p>We may revise these terms from time to time. Continued use of the service after changes take effect means you accept the updated version.</p>
        </section>
      </div>
    </main>
  );
}
