import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { PwaLoadingScreen } from "@/components/pwa-loading-screen";
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
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nationaldex.vercel.app",
  ),
  title: {
    default: "nationaldex",
    template: "%s | nationaldex",
  },
  description: "minimal pokédex",
  manifest: "/manifest.json",
  openGraph: {
    siteName: "nationaldex",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "nationaldex",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${mono.variable} font-mono antialiased`}>
        <div
          id="pwa-loading-screen"
          className="pwa-loading-screen"
          aria-hidden="true"
        >
          <div className="pwa-loading-content">
            <div className="pwa-loading-title">nationaldex</div>
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
