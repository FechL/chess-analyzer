import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = process.env.API_PORT || env.API_PORT || "3001";
  return {
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: Number(process.env.DEV_PORT || env.DEV_PORT || 5173),
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "opening-book": [
            fileURLToPath(
              new URL("./src/data/opening-book.json", import.meta.url),
            ),
          ],
          "chess-rules": ["chess.js"],
          "obsidian-ui": [
            "motion/react",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
          ],
        },
      },
    },
  },
};
});
