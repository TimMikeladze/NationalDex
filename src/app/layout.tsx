import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Logo } from "@/components/brand/logo";
import { Providers } from "@/components/providers";
import { PwaLoadingScreen } from "@/components/pwa-loading-screen";
import { PwaRegister } from "@/components/pwa-register";
import { SURFACE, startupImages } from "@/lib/pwa-assets";
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
  // An app can't be pinched or double-tapped into zoom. Android obeys these;
  // iOS ignores them, so `touch-action` in globals.css covers it there.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // A software keyboard shrinks the layout instead of sliding over it, so a
  // focused field is never under the keyboard (Android; iOS ignores it).
  interactiveWidget: "resizes-content",
  // The surface under the status bar for a first paint that follows the
  // system. `ThemeColor` rewrites every one of these with the theme that
  // actually resolved, since the theme here is a stored choice as often as it
  // is the system's.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SURFACE.light },
    { media: "(prefers-color-scheme: dark)", color: SURFACE.dark },
  ],
  colorScheme: "light dark",
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
    // Without a launch image per device iOS opens every launch on white.
    startupImage: startupImages(),
  },
  // Numbers in move power, stat totals and card ids are not phone numbers.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
    date: false,
    url: false,
  },
  // No `icons` here on purpose: setting it switches off Next's file
  // conventions, which link `favicon.ico`, `icon.svg` (the app bar's mark) and
  // `apple-icon.tsx` — the one iOS uses, since it ignores manifest icons.
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
            <Logo iconClassName="size-16" labelClassName="text-2xl" />
            <div className="pwa-loading-bar">
              <div className="pwa-loading-bar-fill" />
            </div>
          </div>
        </div>
        <PwaLoadingScreen />
        <PwaRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
