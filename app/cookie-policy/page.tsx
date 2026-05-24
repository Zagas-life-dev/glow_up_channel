import Link from "next/link"

export const metadata = {
  title: { absolute: "Cookie Policy | GlowUp" },
  description: "Learn how GlowUp uses cookies and tracking technologies.",
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen w-full max-w-4xl mx-auto px-4 py-10 lg:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: February 18, 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          This Cookie Policy explains how GlowUp ("we", "us", or "our") uses cookies and similar tracking technologies on our website and application. It outlines what these technologies are, why we use them, and your rights in controlling our use of them.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            1. What are cookies?
          </h2>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            2. Why do we use cookies?
          </h2>
          <p>We use first-party and third-party cookies for several reasons:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-medium text-foreground">Strictly Necessary Cookies:</span> These are required for the operation of our Service, such as keeping you securely logged in.</li>
            <li><span className="font-medium text-foreground">Performance and Functionality Cookies:</span> These are used to recognize you when you return to our Service, allowing us to personalize our content for you and remember your preferences.</li>
            <li><span className="font-medium text-foreground">Analytics Cookies:</span> These allow us to recognize and count the number of visitors and see how visitors move around our Service.</li>
            <li><span className="font-medium text-foreground">Advertising Cookies:</span> These cookies record your visit to our website, the pages you have visited, and the links you have followed. This information may be shared with third parties (such as Google AdSense) to show you relevant advertisements.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            3. Third-Party Advertising and the DART Cookie
          </h2>
          <p>
            Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website or other websites. 
            Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.
          </p>
          <p>
            Users may opt out of personalized advertising by visiting <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads Settings</a>. You can also opt out of some third-party vendors' uses of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.aboutads.info/choices</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            4. How can I control cookies?
          </h2>
          <p>
            You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, though your access to some functionality and areas of our website may be restricted. Since the means by which you can refuse cookies through your web browser controls vary from browser-to-browser, you should visit your browser's help menu for more information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            5. Contact Us
          </h2>
          <p>
            If you have any questions about our use of cookies or other technologies, please email us at: <a href="mailto:glowupchannel.info@gmail.com" className="text-primary hover:underline">glowupchannel.info@gmail.com</a>.
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
