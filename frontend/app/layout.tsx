import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HashScroller } from "@/components/ui/HashScroller";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { USE_MOCK } from "@/lib/server-config";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Freery - Ferry tracking, made clear",
    template: "%s | Freery",
  },
  description:
    "Freery shows where the ferry is, whether it is boarding and how many seats are estimated to be free, so student passengers can reach the port with less guesswork.",
  applicationName: "Freery",
  keywords: ["ferry tracking", "Route A", "LoRa", "GPS", "passenger information"],
  openGraph: {
    title: "Freery - Ferry tracking, made clear",
    description:
      "Follow ferries on Route A, check estimated seats and find every station.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#087e83",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <ScrollToTop />
        <HashScroller />
        <Navbar useMock={USE_MOCK} />
        <main id="main">{children}</main>
        <Footer useMock={USE_MOCK} />
      </body>
    </html>
  );
}
