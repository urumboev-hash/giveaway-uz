import type { MetadataRoute } from "next";

// нужен, чтобы сайт можно было добавить на экран «Домой» (на iPhone push работает только так)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiveUz — бесплатные розыгрыши и акции Узбекистана",
    short_name: "GiveUz",
    description: "Все бесплатные розыгрыши, подарки и акции из Instagram по всему Узбекистану",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#db2777",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
