import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

/**
 * The dev server proxies `/api` and `/apis` to `kubectl proxy --port 8001`
 * (over HTTP, not HTTPS — kubectl proxy terminates TLS locally).
 * Watch uses plain chunked-encoding streams, so no WebSocket upgrade is needed.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src/"),
    },
  },
  server: {
    port: 3001,
    proxy: {
      "/apis": {
        target: "http://localhost:8001",
        changeOrigin: true,
        ws: true,
      },
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
