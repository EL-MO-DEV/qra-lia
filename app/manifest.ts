import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qra Lia — اقرا ليا",
    short_name: "Qra Lia",
    description: "صوّر أي ورقة ونشرحها ليك بالدارجة",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#f6f1e7",
    theme_color: "#0b6e5f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
