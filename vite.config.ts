import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Code-splitting de vendors pesados → bundle inicial más liviano.
    // Cada vendor se carga sólo cuando alguna ruta efectivamente lo necesita.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-tanstack": ["@tanstack/react-query"],
          "vendor-forms":    ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-dates":    ["date-fns", "react-day-picker"],
          "vendor-icons":    ["lucide-react"],
        },
      },
    },
  },
});
