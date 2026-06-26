export default function TermsPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-12">Last Updated: October 2026</p>

        <div className="prose prose-invert max-w-none">
          <p>
            These Terms of Service ("Terms") govern your use of the Kloqra platform, website, and
            related services.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">1. Account Responsibilities</h3>
          <p>
            You are responsible for maintaining the security of your account and password. Kloqra
            cannot and will not be liable for any loss or damage from your failure to comply with
            this security obligation.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">2. Subscription and Billing</h3>
          <p>
            Services are billed in advance on a monthly or annual basis and are non-refundable.
            There will be no refunds or credits for partial months of service, downgrade refunds, or
            refunds for months unused with an open account.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">3. Acceptable Use</h3>
          <p>
            You must not use the service for any illegal or unauthorized purpose. You must not, in
            the use of the Service, violate any laws in your jurisdiction (including but not limited
            to copyright or trademark laws).
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">4. Modifications to Service</h3>
          <p>
            Kloqra reserves the right at any time and from time to time to modify or discontinue,
            temporarily or permanently, the Service (or any part thereof) with or without notice.
          </p>
        </div>
      </div>
    </div>
  );
}
