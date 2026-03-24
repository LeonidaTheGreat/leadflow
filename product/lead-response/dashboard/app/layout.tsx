import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { UtmCaptureTracker } from "@/components/utm-capture-tracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadFlow AI - AI Lead Response for Real Estate Agents | 24/7 SMS Follow-Up",
  description: "Stop losing leads to slow response times. LeadFlow AI texts your real estate leads within 30 seconds, 24/7. Pilot program now open. TCPA-compliant.",
  keywords: "real estate AI, lead response, SMS automation, Follow Up Boss, real estate automation",
  openGraph: {
    title: "LeadFlow AI - Never Lose Another Lead to Slow Response",
    description: "AI responds to your real estate leads in under 30 seconds, 24/7. Join our pilot program.",
    type: "website",
  },
};

// GA4 Measurement ID — set NEXT_PUBLIC_GA4_MEASUREMENT_ID in Vercel env vars.
// In local dev the script loads in no-op mode (ID is undefined → script skipped).
const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* ── GA4: async loader (FR-1) ─────────────────────────────────────── */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  anonymize_ip: true,
                  send_page_view: true
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UtmCaptureTracker />
        {children}
      </body>
    </html>
  );
}
