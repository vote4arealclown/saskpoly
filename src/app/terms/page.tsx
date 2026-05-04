export const metadata = {
  title: "Terms of Service - SaskPoly",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
      <div className="space-y-6 text-zinc-400 text-sm leading-relaxed">
        <p>
          Welcome to SaskPoly. By accessing or using our platform, you agree to be bound by these
          Terms of Service. If you do not agree to these terms, please do not use our services.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">1. Eligibility</h2>
        <p>
          You must be at least 18 years old and legally capable of entering into contracts to use SaskPoly.
          By using our platform, you represent and warrant that you meet these requirements.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">2. Prediction Markets</h2>
        <p>
          SaskPoly provides a platform for users to create and participate in prediction markets.
          Markets involve real money and carry financial risk. You acknowledge that:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>All bets are final once placed</li>
          <li>Market outcomes are determined by our admin and audit team</li>
          <li>Platform fees (vig) apply to all transactions</li>
          <li>Past performance does not guarantee future results</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">3. Prohibited Activities</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the platform for illegal purposes</li>
          <li>Manipulate markets or engage in fraudulent behavior</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Create markets about illegal activities or harmful events</li>
          <li>Use automated systems to place bets without authorization</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">4. Account Security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials.
          Notify us immediately of any unauthorized use of your account.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">5. Limitation of Liability</h2>
        <p>
          SaskPoly is provided "as is" without warranties of any kind. We are not liable for any
          losses resulting from your use of the platform, including market losses, technical failures,
          or disputes between users.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">6. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the platform
          after changes constitutes acceptance of the new terms.
        </p>

        <p className="text-zinc-500 pt-4">Last updated: May 2026</p>
      </div>
    </div>
  );
}
