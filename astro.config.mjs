import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://talon-landing.vercel.app',

  server: {
    port: 4321,
    host: true
  },

  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const noindex = [
          'air-force-1-price-comparison',
          'air-force-1-resale-guide',
          'amazon-buy-box-strategy',
          'amazon-price-tracker',
          'best-amazon-price-tracking-tools',
          'buy-box-tracker',
          'yeezy-350-price-tracker',
          'yeezy-350-resale-guide',
          'why-your-product-is-not-selling',
          'try',
          'dashboard',
          'docs',
          'examples',
          'analyze',
        ];
        return !noindex.some((slug) => page.includes(`/${slug}/`) || page.endsWith(`/${slug}`));
      },
    }),
  ]
});