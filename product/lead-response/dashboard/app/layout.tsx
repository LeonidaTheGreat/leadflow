import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
