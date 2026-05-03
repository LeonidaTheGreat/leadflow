import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms and Conditions — LeadFlow AI',
  description: 'Terms and Conditions for LeadFlow AI, operated by Imagine Squared.',
}

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold text-white mb-2">Terms and Conditions</h1>
            <p className="text-slate-400 text-sm mb-10">
              Last updated: April 15, 2026 &mdash; Effective immediately
            </p>

            {/* SMS Disclosure Banner — Twilio A2P required disclosures, prominently placed */}
            <div className="mb-10 bg-slate-700/30 border border-slate-600/50 rounded-xl p-6 space-y-3">
              <p className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                SMS Program Disclosures
              </p>
              <p className="text-slate-200">
                <strong className="text-white">Program:</strong> LeadFlow AI — automated SMS lead response on behalf
                of real estate agents.
              </p>
              <p className="text-slate-200">
                <strong className="text-white">Message frequency:</strong> Varies based on lead activity. Leads may
                receive multiple messages per conversation.
              </p>
              <p className="text-slate-200">
                <strong className="text-white">Message and data rates may apply.</strong> Standard carrier rates for
                SMS apply to all messages sent and received.
              </p>
              <p className="text-slate-200">
                <strong className="text-white">To opt out:</strong> Text <strong className="text-white">STOP</strong>{' '}
                at any time to stop receiving messages. Opt-outs are honored immediately.
              </p>
              <p className="text-slate-200">
                <strong className="text-white">For help:</strong> Text <strong className="text-white">HELP</strong>{' '}
                for assistance, or email{' '}
                <a href="mailto:madzunkov@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  madzunkov@gmail.com
                </a>.
              </p>
            </div>

            <div className="space-y-10 text-slate-300 leading-relaxed">

              {/* Section 1 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. About LeadFlow AI</h2>
                <p>
                  LeadFlow AI (&quot;the Service&quot;) is operated by{' '}
                  <strong className="text-white">Imagine Squared</strong>, a sole proprietorship in Ontario, Canada
                  (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;). By creating an account or using the Service,
                  you (&quot;Agent&quot; or &quot;you&quot;) agree to these Terms and Conditions.
                </p>
                <p className="mt-3">
                  LeadFlow AI connects to your Follow Up Boss CRM and automatically sends SMS messages to your real
                  estate leads on your behalf, 24/7, using AI-generated responses.
                </p>
              </section>

              {/* Section 2 — SMS Messaging */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">2. SMS Messaging Program</h2>

                <h3 className="text-base font-semibold text-white mb-2 mt-6">Program Description</h3>
                <p>
                  When you connect your Follow Up Boss account, LeadFlow AI will send automated SMS messages to
                  leads in your CRM. Messages are conversational AI responses designed to qualify leads, answer
                  questions, and book appointments on your behalf.
                </p>

                <h3 className="text-base font-semibold text-white mb-2 mt-6">Your Responsibility to Obtain Consent</h3>
                <p>
                  You are responsible for ensuring your leads have consented to receive SMS messages from you. By
                  enabling LeadFlow AI, you represent that you have the right to contact the leads in your CRM via
                  SMS and that you comply with all applicable laws, including TCPA (US) and Canada&apos;s CASL.
                </p>

                <h3 className="text-base font-semibold text-white mb-2 mt-6">Message Frequency</h3>
                <p>
                  <strong className="text-white">Message frequency varies</strong> based on lead activity and
                  conversation flow. A lead may receive several messages in a single conversation thread.
                </p>

                <h3 className="text-base font-semibold text-white mb-2 mt-6">Message and Data Rates</h3>
                <p>
                  <strong className="text-white">Message and data rates may apply.</strong> Standard carrier SMS
                  rates apply to all messages. LeadFlow AI is not responsible for charges your leads incur from
                  their mobile carrier.
                </p>

                <h3 className="text-base font-semibold text-white mb-2 mt-6">
                  Opt-Out — Text STOP to Stop Messages
                </h3>
                <p>
                  Any lead can text <strong className="text-white">STOP</strong> at any time to immediately stop
                  receiving messages from your LeadFlow AI number. Opt-outs are processed immediately and
                  irrevocably. After opting out, the lead will receive one final confirmation message and no
                  further messages will be sent to that number.
                </p>

                <h3 className="text-base font-semibold text-white mb-2 mt-6">
                  Help — Text HELP for Assistance
                </h3>
                <p>
                  Any lead can text <strong className="text-white">HELP</strong> to receive a response with support
                  contact information. For additional assistance, email{' '}
                  <a href="mailto:madzunkov@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    madzunkov@gmail.com
                  </a>.
                </p>
              </section>

              {/* Section 3 — Subscription */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">3. Subscription and Billing</h2>

                <h3 className="text-base font-semibold text-white mb-2">Monthly Billing</h3>
                <p className="mb-4">
                  LeadFlow AI is a subscription service billed monthly (or annually if you choose the annual plan).
                  Your subscription renews automatically on the same day each month until you cancel. You authorize
                  us to charge your payment method on file for each renewal period.
                </p>

                <h3 className="text-base font-semibold text-white mb-2">Cancel Anytime</h3>
                <p className="mb-4">
                  You can cancel your subscription at any time from your account settings or by emailing us. Cancellation
                  takes effect at the end of your current billing period. You will not be charged for the next period,
                  and no partial refunds are issued for unused time within a billing period.
                </p>

                <h3 className="text-base font-semibold text-white mb-2">Free Trial</h3>
                <p>
                  If your plan includes a free trial, you will not be charged until the trial period ends. You may
                  cancel during the trial at no cost.
                </p>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. Acceptable Use</h2>
                <p className="mb-4">You agree not to use LeadFlow AI to:</p>
                <ul className="space-y-2 pl-1">
                  {[
                    'Send spam, unsolicited messages, or messages to individuals who have not opted in.',
                    'Violate any applicable laws, including TCPA, CASL, or CAN-SPAM.',
                    'Impersonate another person or misrepresent your identity.',
                    'Interfere with or disrupt the Service or its infrastructure.',
                    'Use the Service for any unlawful or fraudulent purpose.',
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-red-400/60 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4">
                  We reserve the right to suspend or terminate accounts that violate these terms without refund.
                </p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Service Availability</h2>
                <p>
                  We aim for high availability but do not guarantee uninterrupted service. The Service is provided
                  &quot;as is.&quot; We are not liable for lost leads, missed appointments, or revenue resulting from
                  downtime or service interruptions.
                </p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Intellectual Property</h2>
                <p>
                  All software, content, and branding associated with LeadFlow AI are owned by Imagine Squared.
                  Your subscription grants you a limited, non-exclusive, non-transferable license to use the Service
                  for your real estate business. You may not copy, modify, or reverse-engineer any part of the Service.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
                <p>
                  To the fullest extent permitted by law, Imagine Squared&apos;s total liability for any claim
                  arising from use of the Service is limited to the amount you paid us in the 30 days preceding
                  the claim. We are not liable for indirect, incidental, or consequential damages.
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">8. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada
                  applicable therein. Any disputes shall be resolved in the courts of Ontario.
                </p>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Changes to These Terms</h2>
                <p>
                  We may update these Terms from time to time. We will notify active subscribers by email at
                  least 7 days before material changes take effect. Continued use of the Service after changes
                  constitutes acceptance of the updated Terms.
                </p>
              </section>

              {/* Section 10 */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">10. Contact Us</h2>
                <p>Questions about these Terms or the SMS program:</p>
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
