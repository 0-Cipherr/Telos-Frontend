import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Privy pulls in a lot of lazily imported code (the wallet list, embedded
    // wallet UI, etc.). Listing it here keeps the dependency pre-bundle stable
    // from startup, so the connect modal never loads stale chunks.
    include: ["@privy-io/react-auth"],
  },
  server: {
    host: true, // expose on the LAN so phones can connect
    port: 5173,
    // allow HTTPS dev tunnels (cloudflared/ngrok) so the phone gets a secure context
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok-free.dev"],
    // Telos-API (port 3000) serves the chat proxy, creators and strategies.
    // Start it with `npm run dev` in Telos-API. changeOrigin stays off so the
    // Host header matches the browser Origin (the API's same-origin check
    // depends on it).
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: false },
      "/creator": { target: "http://localhost:3000", changeOrigin: false },
      "/registry": { target: "http://localhost:3000", changeOrigin: false },
    },
  },
});
