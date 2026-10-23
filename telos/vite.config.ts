import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // expose on the LAN so phones can connect
    port: 5173,
    // allow HTTPS dev tunnels (cloudflared/ngrok) so the phone gets a secure context
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok-free.dev"],
    proxy: {
      "/api": {
        target: "http://localhost:5000", // Change this to your Express port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
