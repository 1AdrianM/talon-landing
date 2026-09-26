import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://talon-landing.vercel.app',

  server: {
    port: 4321,
    host: true
  },

  integrations: [react()]
});