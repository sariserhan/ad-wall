import type { Metadata } from "next";
import Link from "next/link";
import { PrivacySettingsLink } from "@/components/privacy-settings-link";

export const metadata: Metadata = {
  title: "Privacy Policy | WALL",
  description: "Privacy policy for WALL.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__hero">
        <p className="legal-page__eyebrow">WALL legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-page__intro">
          This policy explains what information WALL may collect, how it may be used, and the choices available to people who browse or post on the platform.
        </p>
        <div className="legal-page__actions">
          <Link href="/" className="legal-page__back-link">Back to localwall</Link>
          <Link href="/terms-and-conditions">Terms & Conditions</Link>
          <PrivacySettingsLink className="legal-page__privacy-settings" variant="text" />
        </div>
      </div>

      <div className="legal-page__body">
        <section>
          <h2>1. Information you provide</h2>
          <p>When you create or manage a card, WALL may collect information you choose to submit, such as your display name, business category, service description, photos, pricing, email address, phone number, website, social links, and location details.</p>
        </section>
        <section>
          <h2>2. Account and authentication data</h2>
          <p>If sign-in is enabled, authentication is handled by third-party identity services. WALL may receive basic account identifiers needed to associate cards with the correct user account and to keep posting and editing features secure.</p>
        </section>
        <section>
          <h2>3. Usage and device information</h2>
          <p>WALL may collect technical and usage information such as approximate location, page views, interactions with cards, referral pages, device type, browser details, and timestamps. This information helps operate the service, monitor abuse, and understand how the wall is used.</p>
        </section>
        <section>
          <h2>4. Analytics cookies</h2>
          <p>When available, WALL asks for your consent before enabling analytics cookies. If you allow analytics, we may use a service such as PostHog to measure visits, page usage, and feature interactions so we can improve the product. If you decline, analytics cookies are not enabled on that device unless you change your choice later. You can also clear site data, block cookies, or restrict local storage in your browser settings, which may reset or prevent this choice from being remembered.</p>
        </section>
        <section>
          <h2>5. Support messages and admin review</h2>
          <p>If you contact WALL through the support/contact form, we may collect the message you send along with page context and account details that are available on your account, such as display name, username, business name, email address, or phone number. This information is stored so an administrator can review and respond to your request.</p>
        </section>
        <section>
          <h2>6. How information is used</h2>
          <p>Information may be used to display cards, process payments and renewals, support account access, detect misuse, improve product performance, respond to support requests, and comply with legal obligations.</p>
        </section>
        <section>
          <h2>7. Payments</h2>
          <p>Payment transactions are processed by third-party providers. WALL does not need to store full payment card details to provide posting or renewal flows, but it may receive limited transaction metadata needed to confirm payment status.</p>
        </section>
        <section>
          <h2>8. Sharing of information</h2>
          <p>Public card information is shared on the wall by design. Non-public information may be shared with service providers that support hosting, authentication, storage, analytics, or payment processing, and may also be disclosed where required by law or to protect the platform and its users. Support messages may also be visible to administrators responsible for operating the service.</p>
        </section>
        <section>
          <h2>9. Retention</h2>
          <p>Information may be retained for as long as reasonably necessary to operate the service, maintain records of transactions, prevent fraud, resolve disputes, and satisfy legal or security obligations.</p>
        </section>
        <section>
          <h2>10. Your choices</h2>
          <p>You may be able to update or remove certain card information through your account tools. You can also limit the information you choose to publish, especially contact details and optional social links. For analytics, you can decline the consent prompt, clear site data, or block cookies/local storage in your browser settings.</p>
        </section>
        <section>
          <h2>11. Security</h2>
          <p>WALL uses reasonable administrative and technical measures to protect information, but no internet-based service can guarantee absolute security.</p>
        </section>
        <section>
          <h2>12. Policy updates</h2>
          <p>This policy may change over time as features, providers, or legal requirements change. Continued use of WALL after an update means the revised policy applies from its effective date.</p>
        </section>
      </div>
    </main>
  );
}
