import Link from "next/link"

export const metadata = {
  title: { absolute: "Terms of Service | GlowUp" },
  description: "Terms and conditions governing the use of the GlowUp platform.",
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen w-full max-w-4xl mx-auto px-4 py-10 lg:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: February 18, 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          Welcome to GlowUp ("we", "us", "our"). By accessing or using our platform, tools, and services (collectively, the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            1. Use of the Service
          </h2>
          <p>
            GlowUp provides a platform for opportunity discovery, productivity tracking, and professional networking. You must be at least 13 years old to use the Service. You agree to use the Service only for lawful purposes and in a manner that does not infringe the rights of, restrict, or inhibit anyone else's use of the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            2. User Accounts
          </h2>
          <p>
            When you create an account, you must provide accurate and complete information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            3. User Content
          </h2>
          <p>
            You retain ownership of any content you submit or post on the Service ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display such content in connection with providing and promoting the Service. We reserve the right to remove any content that violates these Terms or our community guidelines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            4. Provided Opportunities and Job Listings
          </h2>
          <p>
            GlowUp aggregrates and hosts opportunities such as jobs, events, and scholarships. While we strive to verify our providers, we do not guarantee the validity, safety, or quality of any third-party opportunity. Users are encouraged to exercise due diligence before engaging with any external organization or listing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            5. Intellectual Property
          </h2>
          <p>
            The software, design, text, graphics, and other materials on the Service are owned by or licensed to GlowUp and are protected by intellectual property laws. You may not copy, modify, distribute, or reproduce any part of the Service without our prior written consent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            6. Third-Party Links and Advertising
          </h2>
          <p>
            The Service may contain links to third-party websites or services that are not owned or controlled by GlowUp. This includes advertisements served by third-party networks (e.g., Google AdSense). We assume no responsibility for the content, privacy policies, or practices of any third-party websites. Interaction with any such third party is solely between you and them.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, GlowUp shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            8. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of any material changes typically by updating the date at the top of this page. Your continued use of the Service after such modifications constitutes your acceptance of the refreshed Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            9. Contact Information
          </h2>
          <p>
            For any questions or concerns regarding these Terms of Service, please contact us at:
          </p>
          <p className="text-foreground">
            GlowUp<br />
            Email:{" "}
            <a
              href="mailto:glowupchannel.info@gmail.com"
              className="text-primary hover:underline"
            >
              glowupchannel.info@gmail.com
            </a>
          </p>
        </section>

        <div className="pt-4 border-t border-border mt-8 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="text-primary hover:underline whitespace-nowrap"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
