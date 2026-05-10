import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://talon-landing.vercel.app',
  server: {
    port: 4321,
    host: true
  }
});