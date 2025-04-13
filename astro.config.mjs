import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import icon from "astro-icon";

export default defineConfig({
  integrations: [
    icon(),
    tailwind({
      config: { path: './tailwind.config.cjs' },
    }),
  ],
  output: 'server',
  adapter: netlify(),
});