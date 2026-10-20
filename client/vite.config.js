import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import siteSeoPlugin from './seo/siteSeoPlugin.js';

const LOCAL_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i;
const PLACEHOLDER_API_PATTERN = /yourdomain\.com/i;

export default defineConfig(({ command, mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = (process.env.VITE_API_URL || fileEnv.VITE_API_URL || '').trim();

  // Only `vite build --mode production` is checked. `vite preview` also runs
  // with mode "production" but only serves an already-built dist, so it must
  // not be made to demand an API URL of its own — hence the command check.
  if (command === 'build' && mode === 'production') {
    if (!apiUrl) {
      throw new Error(
        'VITE_API_URL is required for a production build. Set it in client/.env.production, ' +
          'as a Vercel environment variable, or inline it for a one-off build: ' +
          'VITE_API_URL=https://api.example.com/api npm run build'
      );
    }

    if (!(process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL || '').trim()) {
      throw new Error(
        'VITE_SITE_URL is required for a production build (e.g. https://www.example.com). It drives canonical ' +
          'tags, the prerendered pages, structured data and sitemap.xml — without it the site ships without SEO.'
      );
    }

    if (LOCAL_API_PATTERN.test(apiUrl)) {
      // Refused for local builds too, not just deploys. A localhost API baked
      // into a bundle yields a site that loads fine and cannot talk to
      // anything, and a build that merely warns is one careless `vercel
      // deploy` away from shipping. Local development gets its local API from
      // client/.env.development.local, which production mode never reads.
      throw new Error(
        `VITE_API_URL is "${apiUrl}", which is a local address. A production bundle must point ` +
          'at the public API. For local development use npm run dev, which reads ' +
          'client/.env.development.local.'
      );
    }

    if (PLACEHOLDER_API_PATTERN.test(apiUrl)) {
      throw new Error(
        `VITE_API_URL is "${apiUrl}", which is still the placeholder. Replace it with your real deployed API URL.`
      );
    }
  }

  return {
    plugins: [react(), tailwindcss(), siteSeoPlugin((process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL || '').trim(), apiUrl, { ...fileEnv, ...process.env })],
    server: {
      port: 5174,
      strictPort: true,
    },
    preview: {
      port: 4173,
    },
  };
});