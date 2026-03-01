import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GlowUp",
    short_name: "GlowUp",
    description: "Connect young ambitious people to opportunities, events, and free resources.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1520",
    theme_color: "#ff6700",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      { src: "/images/Yellow and Black Modern Media Company Logo (14).png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/Yellow and Black Modern Media Company Logo (14).png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/Yellow and Black Modern Media Company Logo (14).png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["social", "lifestyle"],
  }
}
