import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@/ui": path.resolve(import.meta.dirname, "./src/ui"),
      "@/components": path.resolve(import.meta.dirname, "./src/components"),
      "@/lib": path.resolve(import.meta.dirname, "./src/lib"),
    },
  },
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
