/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH permet d'héberger PISTIS dans un sous-dossier (ex. GitHub Pages : /pistis/).
// En local, laisser vide.
const base = process.env.BASE_PATH ?? '/';

/**
 * Politique de sécurité du contenu (CSP), ajoutée à la version finale seulement.
 * Elle interdit techniquement à l'application de contacter un autre site : même un bug ou une
 * bibliothèque malveillante ne pourrait pas envoyer tes données ailleurs. C'est la traduction
 * concrète de la promesse « 100 % local ».
 * (Le mode développement de Vite a besoin de scripts injectés : il n'en reçoit pas.)
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  // Seule exception : l'API Google Agenda (lecture seule), appelée uniquement si l'utilisateur la connecte.
  "connect-src 'self' blob: https://www.googleapis.com",
  "img-src 'self' blob: data:",
  "style-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'pistis-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      // « prompt » : la nouvelle version attend l'accord de l'utilisateur (voir UpdateBanner.tsx).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        id: './',
        name: 'PISTIS',
        short_name: 'PISTIS',
        description: 'Organise ta vie. Développe ton potentiel. Construis ton avenir.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F8F3EA',
        theme_color: '#F8F3EA',
        categories: ['productivity', 'lifestyle', 'finance'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout ce qui est nécessaire au fonctionnement hors ligne, y compris le moteur SQLite (.wasm).
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,webmanifest,woff2}'],
        // Fichiers du paquet SQLite que PISTIS n'utilise pas (autres modes de stockage) : inutile de les télécharger.
        globIgnores: [
          '**/sqlite3-worker1-*.js',
          '**/sqlite3-opfs-async-proxy-*.js',
          // Alphabets non utilisés par le français et l'anglais : chargés seulement si besoin.
          '**/inter-cyrillic*.woff2',
          '**/inter-greek*.woff2',
          '**/inter-vietnamese*.woff2',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Première installation : l'application fonctionne hors ligne sans rechargement.
        // Les mises à jour suivantes, elles, attendent l'accord de l'utilisateur.
        clientsClaim: true,
        skipWaiting: false,
      },
    }),
  ],
  // Le paquet SQLite charge son .wasm lui-même : Vite ne doit pas le pré-empaqueter.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
