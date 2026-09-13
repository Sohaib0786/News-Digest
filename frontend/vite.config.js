import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, requests to /api/* are proxied to the FastAPI
// backend on :8000, so the app can just call fetch("/api/news") with no
// CORS setup needed. `npm run build` produces frontend/dist, which the
// backend serves directly in production (see backend/main.py).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
