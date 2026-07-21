import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  publicDir: ".vite-public",
  plugins: [
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
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
