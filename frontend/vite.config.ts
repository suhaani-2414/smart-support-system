import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

/**
 * Local-dev HTTPS: serves HTTPS from the Vite dev server when both
 * HTTPS_KEY_PATH and HTTPS_CERT_PATH point at readable files. Otherwise
 * falls back to plain HTTP.
 *
 * This config file is only used for `npm run dev` / `npm run preview`.
 * In production the frontend is BUILT (`npm run build` → ./dist) and
 * served as static files by Render — Render handles HTTPS at the edge.
 */
function loadHttps() {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (!keyPath || !certPath) return undefined;

  const resolvedKey = path.resolve(keyPath);
  const resolvedCert = path.resolve(certPath);

  if (!fs.existsSync(resolvedKey) || !fs.existsSync(resolvedCert)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[vite] HTTPS env vars set but files not found (${resolvedKey}, ${resolvedCert}). Starting in HTTP mode.`,
    );
    return undefined;
  }

  return {
    key: fs.readFileSync(resolvedKey),
    cert: fs.readFileSync(resolvedCert),
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    https: loadHttps(),
    port: 5173,
    host: "localhost",
  },
});
