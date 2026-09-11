import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Cooperative Gig Platform",
        short_name: "CoopGig",
        start_url: "/",
        display: "standalone",
        background_color: "#F3EFE6",
        theme_color: "#2C5F4A",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml" }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});
