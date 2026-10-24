import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout dans un vrai navigateur : `npm run test:e2e`.
 * La version finale est construite puis servie sur http://localhost:4173 automatiquement.
 * Les mêmes parcours sont joués sur un téléphone (Pixel 7) et sur un ordinateur.
 *
 * CHROMIUM_PATH (facultatif) : chemin d'un Chromium déjà installé, si on ne veut pas
 * télécharger celui de Playwright (`npx playwright install chromium`).
 */
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'téléphone', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
