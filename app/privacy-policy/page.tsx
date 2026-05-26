import Link from "next/link"

export const metadata = {
  title: { absolute: "Privacy Policy | GlowUp" },
  description: "How GlowUp collects, uses, shares, and protects your information.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen w-full max-w-4xl mx-auto px-4 py-10 lg:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: February 18, 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          This Privacy Policy describes how GlowUp (&quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) collects, uses, shares, and protects your information when you
          use our website, apps, and related services (collectively, the &quot;Service&quot;).
          By using the Service, you agree to the practices described in this Privacy Policy.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p>We may collect the following categories of information:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-medium text-foreground">Account Information:</span>{" "}
              name, email address, username, password, and profile details.
            </li>
            <li>
              <span className="font-medium text-foreground">Contact Information:</span>{" "}
              email address, phone number, and other contact details you provide.
            </li>
            <li>
              <span className="font-medium text-foreground">Usage Data:</span> pages
              viewed, features used, clicks, referring / exit pages, and other analytics
              information about how you interact with the Service.
            </li>
            <li>
              <span className="font-medium text-foreground">Device and Technical Data:</span>{" "}
              IP address, browser type, device identifiers, operating system, and similar
              technical information.
            </li>
            <li>
              <span className="font-medium text-foreground">Content You Provide:</span>{" "}
              posts, messages, uploads, feedback, and other content you submit.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Cookies and Similar Technologies:
              </span>{" "}
              information collected through cookies, web beacons, and similar tools to
              recognize your device, remember your preferences, and analyze traffic. This
              includes third-party advertising technologies (such as Adsterra) that may use
              cookies or similar identifiers to serve ads based on your visits to this and
              other sites on the Internet.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <p>We may use your information to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide, operate, and maintain the Service.</li>
            <li>Personalize and improve your experience.</li>
            <li>Communicate with you about your account and the Service.</li>
            <li>Send you marketing and promotional messages (where permitted by law).</li>
            <li>Monitor and analyze trends, usage, and activities.</li>
            <li>Detect, prevent, and address fraud, abuse, or security issues.</li>
            <li>Comply with legal obligations and enforce our terms and policies.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            3. Sale and Sharing of Your Information
          </h2>
          <p>
            Subject to applicable laws, we may sell, rent, or otherwise share certain
            personal information with third parties, including:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Advertising partners and networks (including Adsterra).</li>
            <li>Analytics and market research providers.</li>
            <li>Business partners and affiliates.</li>
            <li>
              Potential or actual buyers, investors, or other parties in connection with a
              merger, acquisition, financing, or sale of assets.
            </li>
          </ul>
          <p>
            These third parties may use your information for their own marketing, analytics,
            or other purposes allowed by law. Where required, we will provide you with
            notice and a way to opt out of the sale of your personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            4. Your Choices and Rights
          </h2>
          <p>
            Depending on where you live, you may have the right to access, correct, delete,
            or restrict certain uses of your personal information, and to object to certain
            processing activities. You may also have the right to:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Request a copy of the personal information we hold about you.</li>
            <li>Request that we correct inaccurate or incomplete information.</li>
            <li>Request deletion of certain personal information.</li>
            <li>
              Opt out of marketing communications by using the unsubscribe link in our
              emails or updating your preferences.
            </li>
            <li>
              Opt out of the sale of your personal information where this right is provided
              by law.
            </li>
          </ul>
          <p>
            To exercise any of these rights, you can contact us using the details provided
            below. We may need to verify your identity before processing your request.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            5. Data Retention
          </h2>
          <p>
            We keep your personal information for as long as necessary to provide the
            Service, comply with our legal obligations, resolve disputes, and enforce our
            agreements. When we no longer need your information, we will delete or
            anonymize it, or, if that is not possible, we will securely store it and isolate
            it from further use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            6. Data Security
          </h2>
          <p>
            We use reasonable technical and organizational measures to help protect your
            personal information. However, no method of transmission over the Internet or
            method of electronic storage is completely secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            7. International Transfers
          </h2>
          <p>
            Your information may be transferred to and processed in countries other than the
            country in which you are resident. These countries may have data protection
            laws that are different from those in your country. Where required, we will
            take appropriate steps to ensure that your personal information receives an
            adequate level of protection.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            8. Children&apos;s Privacy
          </h2>
          <p>
            The Service is not intended for children under the age of 13 (or such other age
            as required by applicable law), and we do not knowingly collect personal
            information from children. If we learn that we have collected personal
            information from a child in violation of applicable law, we will take steps to
            delete that information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            9. Changes to This Privacy Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise
            the &quot;Last updated&quot; date at the top of this page. In some cases, we may
            provide additional notice (such as by sending you an email or displaying a
            prominent notice within the Service). Your continued use of the Service after
            any changes become effective means you accept the updated Privacy Policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            10. Contact Us
          </h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy
            or our data practices, please contact us at:
          </p>
          <p className="text-foreground">
            GlowUp<br />
            Email:{" "}
            <a
              href="mailto:support@glowup.example"
              className="text-primary hover:underline"
            >
              support@glowup.example
            </a>
          </p>
        </section>

        <div className="pt-4 border-t border-border mt-8 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            This summary is for general information only and does not replace legal advice.
          </span>
          <Link
            href="/"
            className="text-primary hover:underline whitespace-nowrap ml-4"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

