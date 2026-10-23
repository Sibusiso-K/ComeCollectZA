import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Mono,
  Atkinson_Hyperlegible_Next,
  Bricolage_Grotesque,
} from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-face",
  display: "swap",
});

// Next has no metric data for these faces, so it skips the generated fallback. The CSS stacks in globals.css already fall back to system fonts.
const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body-face",
  display: "swap",
  adjustFontFallback: false,
});

const mono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono-face",
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
  themeColor: "#0E7A4C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable + " " + body.variable + " " + mono.variable}>
      <body className="min-h-dvh antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
