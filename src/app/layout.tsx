import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Production URL keeps OG/Twitter image resolution correct on Vercel;
  // falls back to localhost in local development builds.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://challenge6-phi.vercel.app"
  ),
  title: "HawaSathi - Urban Air Quality Assistant",
  description:
    "Air-aware daily action plans for Indian families and communities: modelled air data with honest provenance, low-emission routines, indoor air actions and explainable impact estimates. AI explanations via server-side gemini-3.5-flash-lite.",
  keywords: [
    "air quality",
    "AQI",
    "PM2.5",
    "urban air pollution",
    "India",
    "Gemini",
  ],
  authors: [{ name: "HawaSathi" }],
  openGraph: {
    title: "HawaSathi - Urban Air Quality Assistant",
    description:
      "Air-aware daily action plans for Indian families and communities: modelled air data with honest provenance, low-emission routines, indoor air actions and explainable impact estimates.",
    images: [{ url: "/og-image.png", width: 1024, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HawaSathi - Urban Air Quality Assistant",
    description:
      "Air-aware daily action plans for Indian families and communities.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
