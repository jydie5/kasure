import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Instrument_Serif, Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ViewerSlot } from "@/components/viewer-slot";
import { Cursor } from "@/components/cursor";
import { Magnetic } from "@/components/magnetic";
import { KasureFilters } from "@/components/kasure-filters";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const shippori = Shippori_Mincho({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  preload: false,
});
const zen = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Kasure — かすれのあるノート", template: "%s — Kasure" },
  description: "きれいに書かなくていい。かすれた線にこそ、考えた速度が残る。静かに書き、熟したものだけを共有するためのノート。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eee6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${shippori.variable} ${zen.variable}`}
    >
      <body>
        <KasureFilters />
        <a href="#main" className="sr-only">
          本文へ移動
        </a>
        <SiteHeader>
          <Suspense fallback={<span className="avatar skeleton" aria-hidden />}>
            <ViewerSlot />
          </Suspense>
        </SiteHeader>
        {children}
        <div className="grain" aria-hidden />
        <Cursor />
        <Magnetic />
      </body>
    </html>
  );
}
