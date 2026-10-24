import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * VERSION D'ESSAI — un seul fichier HTML autonome, publiable comme page de démonstration.
 *
 *   npm run build:demo   →   dist-demo/index.html
 *
 * Différences avec l'application réelle (vite.config.ts), et seulement ici :
 *  - SQLite en JavaScript pur (sql.js) dans la page, copie dans IndexedDB : pas de travailleur ni d'OPFS ;
 *  - pas de service worker (PWA) ni de CSP propre : c'est la page d'accueil qui impose la sienne ;
 *  - routeur en mémoire et bandeau « Version d'essai ».
 * L'application réelle n'est pas modifiée par ce fichier.
 */
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

function demoSwap(): Plugin {
  return {
    name: 'pistis-demo-swap',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'virtual:pwa-register/react') return here('./src/demo/pwaStub.ts');
      if (source.endsWith('/data/web/webDatabase') && importer && !importer.includes('/src/demo/')) {
        return here('./src/demo/demoDatabase.ts');
      }
      return null;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), demoSwap(), viteSingleFile({ removeViteModuleLoader: true })],
  build: { outDir: 'dist-demo', target: 'es2022', sourcemap: false, emptyOutDir: true },
});
