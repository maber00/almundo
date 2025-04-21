import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import icon from 'astro-icon';

export default defineConfig({
  // Salida en modo servidor para usar funciones
  output: 'server',

  // Adapter de Netlify y carpeta de funciones explícita
  adapter: netlify({
    // Carpeta donde Netlify buscará tus serverless functions
    functions: 'netlify/functions',
    // Opciones adicionales si las necesitas:
    // edge: false,
    // branchDeploy: false,
  }),

  // Integraciones de Astro
  integrations: [
    icon(),
    tailwind({
      config: { path: './tailwind.config.cjs' },
    }),
  ],
});
