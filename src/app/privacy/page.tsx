export const metadata = {
  title: "Privacy Policy - SaskPoly",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
      <div className="space-y-6 text-zinc-400 text-sm leading-relaxed">
        <p>
          SaskPoly ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, and safeguard your information when you use our prediction market platform.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">Information We Collect</h2>
        <p>
          We collect information you provide directly to us, including your name, email address, and payment
          information when you register, create markets, or place bets. We also collect transaction data
          related to your use of the platform.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>To provide and maintain our services</li>
          <li>To process transactions and send related information</li>
          <li>To communicate with you about updates, security alerts, and support</li>
          <li>To comply with legal obligations and prevent fraud</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your personal information.
          All payment processing is handled securely through Stripe. We do not store full credit card
          details on our servers.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">Third-Party Services</h2>
        <p>
          We use trusted third-party services including Stripe for payments and Upstash for caching.
          These services have their own privacy policies and security practices.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">Your Rights</h2>
        <p>
          You have the right to access, update, or delete your personal information. Contact us at
          support@saskpoly.ca for any privacy-related requests.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new policy on this page and updating the effective date.
        </p>

        <p className="text-zinc-500 pt-4">Last updated: May 2026</p>
      </div>
    </div>
  );
}
