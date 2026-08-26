import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Screenbolt",
    short_name: "Screenbolt",
    description: "Free screen recorder and instant HD video sharing. Record your screen and share it in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f2",
    theme_color: "#f5f5f2",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
