export default function PrivacyPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-12">Last Updated: October 2026</p>

        <div className="prose prose-invert max-w-none">
          <p>
            At Kloqra, privacy is a core architectural principle. We believe you should own your
            data, and we do not sell or monetize personal information.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">1. Data We Collect</h3>
          <p>
            We collect the minimum amount of data necessary to provide our time tracking services.
            This includes your name, email address, IP address, and the time entries you actively
            log via our applications.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Data</h3>
          <p>
            Your data is strictly used to render your timesheets, provide analytics to your employer
            (Tenant Owner / Admins), and process billing.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">3. Data Portability and GDPR</h3>
          <p>
            You have the right to request a complete export of your personal data at any time.
            Organization administrators can also request comprehensive tenant-level exports in CSV
            format via the Export Wizard.
          </p>

          <h3 className="text-2xl font-bold mt-8 mb-4">4. Subprocessors</h3>
          <p>
            We use a limited number of trusted third-party subprocessors to deliver our service
            (e.g., AWS for hosting, Stripe for payments). A full list of our subprocessors is
            available upon request.
          </p>
        </div>
      </div>
    </div>
  );
}
