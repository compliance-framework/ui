import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';

// Opt-in dev proxy: `VITE_API_PROXY=http://localhost:8080 npm run dev` sends /api through the dev
// server, so the UI and API share an origin and the API's CORS allow-list doesn't matter. Useful
// when local-dev's containers hold port 3000 and Vite falls back to another port. Leave
// VITE_API_URL unset with it, so requests stay relative.
const apiProxy = process.env.VITE_API_PROXY;

// https://vite.dev/config/
export default defineConfig({
  // The dev tools overlay is left out of browser checks (E2E=1), so it can't affect them.
  plugins: [vue(), ...(process.env.E2E ? [] : [vueDevTools()]), tailwindcss()],
  server: {
    port: 3000, // must be a port other than 5173
    host: true,
    watch: {
      usePolling: true,
      // Agent worktrees (Claude Code) live here; edits in them must not reload this server.
      ignored: ['**/.claude/**'],
    },
    ...(apiProxy
      ? { proxy: { '/api': { target: apiProxy, changeOrigin: true } } }
      : {}),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
