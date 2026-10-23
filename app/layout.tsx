import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, Silkscreen } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { Providers } from "@/components/app/providers";
import { THEME_BOOT } from "@/lib/app/theme-boot";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-face",
  display: "swap",
});

// Next has no metric data for these faces, so it skips the generated fallback. The CSS stacks already fall back to system fonts.
const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body-face",
  display: "swap",
  adjustFontFallback: false,
});

const dot = Silkscreen({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dot-face",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "ComeCollectZA",
  description: "Get paid fairly for every kilogram you collect.",
  applicationName: "ComeCollectZA",
  appleWebApp: { capable: true, title: "ComeCollectZA", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F0C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={display.variable + " " + body.variable + " " + dot.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
