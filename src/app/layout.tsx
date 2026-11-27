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
