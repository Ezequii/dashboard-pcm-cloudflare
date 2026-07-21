import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { resolve } from "node:path";

export default defineConfig({
  publicDir: ".vite-public",
  plugins: [
    react(),
    cloudflare({
      configPath: "./wrangler.vite.toml",
      inspectorPort: false,
    }),
  ],
  build: {
    outDir: "dist-vite",
    emptyOutDir: true,
    manifest: true,
    target: "baseline-widely-available",
    rollupOptions: {
      input: {
        legacy: resolve(process.cwd(), "index.html"),
        reactPreview: resolve(process.cwd(), "preview-v123.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
