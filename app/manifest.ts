import type { MetadataRoute } from "next";

// Makes the app installable. On Android, Chrome offers "Install app". On iPhone, use Share, then Add to Home Screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ComeCollectZA",
    short_name: "ComeCollect",
    description: "Get paid fairly for every kilogram you collect.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b2415",
    theme_color: "#0b2415",
    categories: ["finance", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
