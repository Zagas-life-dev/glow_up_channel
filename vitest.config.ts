import path from "node:path"
import { defineConfig } from "vitest/config"

/**
 * Test config for the app's client-side units.
 *
 * No @vitejs/plugin-react: tests do not need Fast Refresh, and esbuild's
 * automatic JSX runtime transforms .tsx on its own — which also avoids pinning
 * the plugin's Vite major to whichever one Vitest happens to bundle.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "latest-glowup-channel/**"],
    env: {
      // api-client throws at import time without this whenever `window` exists.
      NEXT_PUBLIC_BACKEND_URL: "http://backend.test",
    },
  },
})
