import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      srcDirectory: "app",
      // Every page renders from the exported results, so each static route is
      // prerendered at build time and served from the ASSETS binding. The Worker
      // only renders on request for unknown paths (the 404 page).
      prerender: { enabled: true, autoSubfolderIndex: false, crawlLinks: false, failOnError: true },
    }),
    react(),
    tailwindcss(),
  ],
});
