import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // CURB_API_URL lets the e2e tests point at their own server instance.
    proxy: { "/api": process.env.CURB_API_URL ?? "http://127.0.0.1:3001" },
  },
});
