import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8787" } },
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { output: { inlineDynamicImports: process.env.VITE_PREVIEW === "1" } } },
});
