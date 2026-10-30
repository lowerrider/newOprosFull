import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // Сайт живёт в корне своего сервера. Для GitHub Pages: VITE_BASE=/репозиторий/ npm run build
  base: process.env.VITE_BASE || "/",
});
