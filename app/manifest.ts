import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GlowUp",
    short_name: "GlowUp",
    description: "Connect young ambitious people to opportunities, events, and free resources.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1520",
    theme_color: "#f96008",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/images/logo-icon-transparent.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/images/logo-icon-transparent.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["social", "lifestyle"],
  }
}
