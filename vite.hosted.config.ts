import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * VERSION WEB HÉBERGÉE — un seul fichier HTML autonome, publiable comme page web intégrée
 * (ex. page claude.ai), accessible par un simple lien depuis un téléphone ou un ordinateur.
 *
 *   npm run build:hosted   →   dist-hosted/pistis.html
 *
 * Différences avec l'application installable (vite.config.ts), et seulement ici :
 *  - SQLite en JavaScript pur (sql.js) dans la page, copie dans IndexedDB : pas de travailleur ni d'OPFS ;
 *  - pas de service worker (PWA) ni de CSP propre : c'est la page d'accueil qui impose la sienne ;
 *  - routeur en mémoire (l'adresse d'une page intégrée ne change pas).
 * Les données restent dans le navigateur ; les sauvegardes passent par la fenêtre d'enregistrement de l'hôte.
 */
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

function hostedSwap(): Plugin {
  return {
    name: 'pistis-hosted-swap',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'virtual:pwa-register/react') return here('./src/hosted/pwaStub.ts');
      if (source.endsWith('/data/web/webDatabase') && importer && !importer.includes('/src/hosted/')) {
        return here('./src/hosted/hostedDatabase.ts');
      }
      return null;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), hostedSwap(), viteSingleFile({ removeViteModuleLoader: true })],
  build: { outDir: 'dist-hosted', target: 'es2022', sourcemap: false, emptyOutDir: true },
});
