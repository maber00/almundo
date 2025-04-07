import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import icon from "astro-icon";


export default defineConfig({
  integrations: [
    icon(),
    tailwind({
      // Opcional: especifica la ruta
      config: { path: './tailwind.config.cjs' },
    }),
  ],
  output: 'server',
  adapter: vercel(),
});