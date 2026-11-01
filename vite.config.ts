import { defineConfig } from "vite";
const buildId =
  process.env.WORKOUT_BUILD_ID ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  "local";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "./",
  define: { __APP_VERSION__: JSON.stringify(buildId) },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Мои тренировки",
        short_name: "Тренировки",
        description: "Ваш ритм. Ваш прогресс.",
        lang: "ru",
        theme_color: "#C94E23",
        background_color: "#FAFAF8",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2,txt}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Activate the fresh cache immediately; AppUpdates never reloads without saving.
        skipWaiting: true,
      },
    }),
  ],
});
