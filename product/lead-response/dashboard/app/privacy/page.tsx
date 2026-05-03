import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — LeadFlow AI',
  description: 'Privacy Policy for LeadFlow AI, operated by Imagine Squared.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <span className="text-lg font-semibold text-white">LeadFlow AI</span>
            </div>
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors">
              ← Back to home
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 md:p-12">
            <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-slate-400 text-sm mb-10">
              Last updated: April 15, 2026 &mdash; Effective immediately
            </p>

            <div className="space-y-10 text-slate-300 leading-relaxed">

              {/* Section 1 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. Who We Are</h2>
                <p>
                  LeadFlow AI is operated by <strong className="text-white">Imagine Squared</strong>, a sole
                  proprietorship registered in Ontario, Canada. Our website is{' '}
                  <a href="https://landyourleads.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    landyourleads.com
                  </a>
                  . If you have any questions about this policy, contact us at{' '}
                  <a href="mailto:madzunkov@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    madzunkov@gmail.com
                  </a>.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">2. What Data We Collect</h2>
                <p className="mb-4">We collect only the information necessary to provide the service:</p>
                <ul className="space-y-3 pl-1">
                  {[
                    {
                      label: 'Account information',
                      desc: 'Your name, email address, and phone number when you sign up.',
                    },
                    {
                      label: 'CRM data from Follow Up Boss',
                      desc:
                        'Lead records including lead names, phone numbers, email addresses, and contact notes — pulled via the Follow Up Boss API when you connect your account.',
                    },
                    {
                      label: 'Billing information',
                      desc:
                        'Payment method details are handled directly by Stripe. We do not store your card number.',
                    },
                    {
                      label: 'Usage data',
                      desc:
                        'Activity logs such as SMS messages sent, response times, and feature usage, used to operate and improve the service.',
                    },
                    {
                      label: 'Cookies and analytics',
                      desc:
                        'We use cookies and Google Analytics (with IP anonymization) to understand how visitors use our website.',
                    },
                  ].map((item) => (
                    <li key={item.label} className="flex gap-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400/60 shrink-0" />
                      <span>
                        <strong className="text-white">{item.label}:</strong> {item.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Data</h2>
                <p className="mb-4">We use your data to:</p>
                <ul className="space-y-2 pl-1">
                  {[
                    'Send automated SMS responses to your real estate leads on your behalf.',
                    'Book appointments with leads via Cal.com when a lead requests one.',
                    'Process subscription payments through Stripe.',
                    'Send transactional email notifications (e.g., account setup, billing receipts) via Resend.',
                    'Provide you with a dashboard showing lead activity and response metrics.',
                    'Improve the service and troubleshoot issues.',
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400/60 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4">
                  We do <strong className="text-white">not</strong> use your data or your leads&apos; data for
                  advertising, profiling, or any purpose unrelated to providing you with the LeadFlow AI service.
                </p>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. Data Sharing</h2>
                <p className="mb-4">
                  We do not sell or share your personal information with third parties for marketing purposes.
                  We share data only with the following service providers, and only as necessary to operate the service:
                </p>
                <div className="space-y-4">
                  {[
                    {
                      name: 'Twilio',
                      purpose:
                        'Sends SMS messages to your leads. Lead phone numbers are transmitted to Twilio solely for message delivery.',
                    },
                    {
                      name: 'Cal.com',
                      purpose:
                        'Handles appointment booking. Lead contact details are shared when a booking link is used.',
                    },
                    {
                      name: 'Stripe',
                      purpose: 'Processes subscription payments. Stripe handles all payment card data directly.',
                    },
                    {
                      name: 'Resend',
                      purpose: 'Delivers transactional email to you (not your leads).',
                    },
                    {
                      name: 'Follow Up Boss',
                      purpose:
                        'We read lead data from your connected FUB account via their API. We write back contact notes and status updates as you configure.',
                    },
                  ].map((provider) => (
                    <div
                      key={provider.name}
                      className="bg-slate-700/20 border border-slate-700/40 rounded-lg px-5 py-4"
                    >
                      <p className="font-semibold text-white mb-1">{provider.name}</p>
                      <p className="text-sm">{provider.purpose}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4">
                  Each of these providers has their own privacy policy and data processing terms. We will not
                  share your information with any other third parties without your explicit consent, except
                  where required by law.
                </p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Data Retention</h2>
                <p className="mb-3">
                  We retain your account data for as long as your subscription is active. If you cancel, we
                  retain data for 90 days in case you wish to reactivate, after which it is permanently deleted.
                </p>
                <p>
                  Lead data (names, phone numbers, conversation logs) is retained for the duration of your
                  subscription and deleted within 90 days of account closure. You may request earlier deletion
                  by contacting us at{' '}
                  <a href="mailto:madzunkov@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    madzunkov@gmail.com
                  </a>.
                </p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. PIPEDA Compliance</h2>
                <p className="mb-3">
                  As a Canadian business, we comply with the{' '}
                  <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA). Under PIPEDA,
                  you have the right to:
                </p>
                <ul className="space-y-2 pl-1">
                  {[
                    'Know what personal information we hold about you.',
                    'Request access to your personal information.',
                    'Request corrections to inaccurate information.',
                    'Withdraw consent for us to use your personal information (subject to legal or contractual restrictions).',
                    'File a complaint with the Office of the Privacy Commissioner of Canada.',
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400/60 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, email us at{' '}
                  <a href="mailto:madzunkov@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    madzunkov@gmail.com
                  </a>. We will respond within 30 days.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">7. Security</h2>
                <p>
                  We use industry-standard security practices including encrypted connections (HTTPS/TLS),
                  access controls, and secure credential storage. No method of transmission over the internet
                  is 100% secure, but we take reasonable steps to protect your information.
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. When we do, we will update the
                  &quot;Last updated&quot; date at the top of this page and notify active subscribers by email.
                  Continued use of LeadFlow AI after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Contact Us</h2>
                <p>
                  Privacy inquiries and data requests can be directed to:
                </p>
                <div className="mt-4 bg-slate-700/20 border border-slate-700/40 rounded-lg px-5 py-4">
                  <p className="text-white font-semibold">Imagine Squared</p>
                  <p>Ontario, Canada</p>
                  <p className="mt-1">
                    Email:{' '}
                    <a href="mailto:madzunkov@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                      madzunkov@gmail.com
                    </a>
                  </p>
                  <p>
                    Website:{' '}
                    <a href="https://landyourleads.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                      landyourleads.com
                    </a>
                  </p>
                </div>
              </section>

            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              ← Back to home
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
