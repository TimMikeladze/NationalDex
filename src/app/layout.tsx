import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Logo } from "@/components/brand/logo";
import { Providers } from "@/components/providers";
import { PwaLoadingScreen } from "@/components/pwa-loading-screen";
import { SITE_URL } from "@/lib/utils";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Android tints its status bar with this, so it has to be the colour of the
  // app right under the bar rather than the brand's red, which belongs to no
  // surface the app ever draws. Installed, the first thing on screen is the
  // loading screen, which is `#09090b` whatever the theme; everywhere else the
  // app opens light, which is what a visitor with scripting off keeps. From
  // there `ThemeColor` takes over and follows the theme that resolved.
  themeColor: [
    { media: "(display-mode: standalone)", color: "#09090b" },
    { media: "(display-mode: fullscreen)", color: "#09090b" },
    { color: "#ffffff" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NationalDex — Every Generation, Indexed",
    template: "%s | NationalDex",
  },
  description:
    "Browse Pokemon stats, moves, abilities, items, type matchups, and more. Build teams, compare Pokemon, and explore all generations in one app.",
  keywords: [
    "pokedex",
    "pokemon",
    "NationalDex",
    "pokemon stats",
    "pokemon moves",
    "pokemon abilities",
    "pokemon types",
    "pokemon team builder",
    "pokemon type coverage",
    "pokemon comparison",
  ],
  manifest: "/manifest.json",
  applicationName: "NationalDex",
  // `max-image-preview: large` is what lets Google show a Pokemon's artwork
  // next to the result instead of a thumbnail or nothing at all.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    siteName: "NationalDex",
    type: "website",
    locale: "en_US",
    title: "NationalDex — Every Generation, Indexed",
    description:
      "Browse Pokemon stats, moves, abilities, items, type matchups, and more. Build teams and explore all generations.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "NationalDex — Every Generation, Indexed",
    description:
      "Browse Pokemon stats, moves, abilities, items, type matchups, and more.",
  },
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NationalDex",
  },
  // All of these are rendered from the app bar's mark by `bun run
  // generate:icons`, so the tab, the installed app, and the header always agree.
  icons: {
    // `src/app/favicon.ico` is linked automatically by Next; this adds the
    // sharper SVG on top for browsers that take it.
    icon: [{ url: "/icons/logo-app.svg", type: "image/svg+xml" }],
    // iOS ignores SVG here, so the touch icon has to stay a PNG.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
        <Script
          src={
            process.env.NEXT_PUBLIC_UMAMI_URL ||
            "https://cloud.umami.is/script.js"
          }
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      )}
      <body className={`${mono.variable} font-mono antialiased`}>
        <div
          id="pwa-loading-screen"
          className="pwa-loading-screen"
          aria-hidden="true"
        >
          <div className="pwa-loading-content">
            <Logo
              iconClassName="size-16"
              labelClassName="text-2xl text-[#e0e0e0]"
            />
            <div className="pwa-loading-bar">
              <div className="pwa-loading-bar-fill" />
            </div>
          </div>
        </div>
        <PwaLoadingScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
