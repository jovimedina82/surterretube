// src/app/privacy/page.tsx
export const metadata = {
  title: 'Privacy Policy - SurterreTube',
  description: 'How SurterreTube collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy for SurterreTube.com</h1>
      <p className="mt-2 text-sm text-gray-500">Last Updated: August 19, 2025</p>

      <p className="mt-6">
        SurterreTube.com (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
        you visit our website SurterreTube.com (the &quot;Site&quot;) or use our video streaming services
        (the &quot;Services&quot;). Please read this policy carefully. If you do not agree with the terms of
        this Privacy Policy, please do not access the Site or use our Services.
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. Information We Collect</h2>
      <p className="mt-2">We may collect the following types of information when you use our Site or Services:</p>

      <h3 className="mt-4 font-medium">Personal Information</h3>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>
          <span className="font-medium">Account Information:</span> When you create an account, we may collect your
          name, email address, username, password, and other information you provide.
        </li>
        <li>
          <span className="font-medium">Payment Information:</span> If you purchase a subscription or other services,
          we collect payment details (e.g., credit card information) through our third-party payment processors. We do
          not store your complete payment information.
        </li>
        <li>
          <span className="font-medium">User Content:</span> Videos, comments, or other content you upload or post to our Services.
        </li>
        <li>
          <span className="font-medium">Contact Information:</span> If you contact us for support or inquiries, we may
          collect your name, email address, and any information you provide in your message.
        </li>
      </ul>

      <h3 className="mt-4 font-medium">Non-Personal Information</h3>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>
          <span className="font-medium">Usage Data:</span> Information about your interactions with the Site, such as
          pages visited, videos watched, time spent on the Site, and search queries.
        </li>
        <li>
          <span className="font-medium">Device Information:</span> Details about the device you use to access our
          Services, including IP address, browser type, operating system, and device identifiers.
        </li>
        <li>
          <span className="font-medium">Cookies and Tracking Technologies:</span> We use cookies, web beacons, and
          similar technologies to track your activity on the Site, personalize content, and improve our Services. You
          can manage cookie preferences through your browser settings.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">2. How We Use Your Information</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Provide, operate, and maintain our Site and Services.</li>
        <li>Process payments and manage subscriptions.</li>
        <li>Personalize your experience, such as recommending videos based on your viewing history.</li>
        <li>Communicate with you (service updates, promotional offers if you opt in, responses to inquiries).</li>
        <li>Analyze usage trends to improve our Site and Services.</li>
        <li>Detect, prevent, and address technical issues, fraud, or security threats.</li>
        <li>Comply with legal obligations or enforce our Terms of Service.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">3. How We Share Your Information</h2>
      <p className="mt-2">We do not sell your personal information. We may share your information in the following cases:</p>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>
          <span className="font-medium">Service Providers:</span> With third-party vendors (e.g., payment processors,
          hosting providers, analytics) that help operate the Site and Services. They are contractually obligated to
          protect your information.
        </li>
        <li>
          <span className="font-medium">Legal Requirements:</span> If required by law (e.g., subpoena, court order, or
          other legal process).
        </li>
        <li>
          <span className="font-medium">Business Transfers:</span> In a merger, acquisition, or sale of assets, your
          information may be transferred as part of the transaction.
        </li>
        <li>
          <span className="font-medium">With Your Consent:</span> When you explicitly consent to such sharing.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">4. Your Choices and Rights</h2>
      <p className="mt-2">Depending on your location, you may have certain rights regarding your personal information, including:</p>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li><span className="font-medium">Access:</span> Request a copy of the personal information we hold about you.</li>
        <li><span className="font-medium">Correction:</span> Request correction of inaccurate or incomplete information.</li>
        <li><span className="font-medium">Deletion:</span> Request deletion of your personal information, subject to legal obligations.</li>
        <li><span className="font-medium">Opt-Out:</span> Unsubscribe from marketing communications via the link in our emails or by contacting us.</li>
        <li><span className="font-medium">Cookies:</span> Manage cookie preferences via your browser settings.</li>
      </ul>
      <p className="mt-2">
        To exercise these rights, please contact us at <a className="text-emerald-700 underline" href="mailto:helpdesk@surterreproperties.com">helpdesk@surterreproperties.com</a>.
        We will respond in accordance with applicable laws.
      </p>

      <h2 className="mt-8 text-xl font-semibold">5. Data Security</h2>
      <p className="mt-2">
        We implement reasonable technical and organizational measures to protect your information from unauthorized
        access, loss, or misuse. However, no system is completely secure, and we cannot guarantee absolute security.
      </p>

      <h2 className="mt-8 text-xl font-semibold">6. Data Retention</h2>
      <p className="mt-2">
        We retain personal information only as long as necessary to fulfill the purposes outlined in this Privacy
        Policy, comply with legal obligations, or resolve disputes. For example, account information is retained while
        your account is active and for a reasonable period thereafter unless you request deletion.
      </p>

      <h2 className="mt-8 text-xl font-semibold">7. Third-Party Links</h2>
      <p className="mt-2">
        Our Site or Services may contain links to third-party websites or services. We are not responsible for the
        privacy practices or content of these third parties. Please review their privacy policies before providing any
        personal information.
      </p>

      <h2 className="mt-8 text-xl font-semibold">8. International Data Transfers</h2>
      <p className="mt-2">
        If you are located outside the United States, your information may be transferred to and processed in the
        United States or other countries where our servers or service providers are located. We take steps to ensure
        such transfers comply with applicable data protection laws.
      </p>

      <h2 className="mt-8 text-xl font-semibold">9. Changes to This Privacy Policy</h2>
      <p className="mt-2">
        We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the
        updated policy on our Site or by sending you an email. Your continued use of the Site or Services after such
        changes constitutes your acceptance of the updated policy.
      </p>

      <h2 className="mt-8 text-xl font-semibold">10. Contact Us</h2>
      <p className="mt-2">
        If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
      </p>
      <address className="mt-2 not-italic">
        SurterreTube.com<br />
        <a className="text-emerald-700 underline" href="mailto:helpdesk@surterreproperties.com">
          helpdesk@surterreproperties.com
        </a>
      </address>
    </main>
  )
}
