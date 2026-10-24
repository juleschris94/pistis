import { expect, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixture = (name: string) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);

/**
 * Surveille la page : toute erreur console, toute violation de la politique de sécurité
 * et toute requête vers un autre site fait échouer le test (promesse « 100 % local »).
 */
export function watchPage(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console : ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`exception : ${err.message}`));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !['blob:', 'data:'].includes(url.protocol))
      problems.push(`requête externe : ${req.url()}`);
  });
  return {
    assertClean: () => expect(problems, problems.join('\n')).toEqual([]),
  };
}

/** Le test enregistre les sauvegardes par téléchargement (la fenêtre « Enregistrer sous » ne s'automatise pas). */
export async function useDownloadsForBackups(context: BrowserContext) {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
  });
}

export async function createProfile(page: Page, nickname: string, opts: { photo?: string; firstName?: string } = {}) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Commencer' }).click();
  if (opts.firstName) await page.getByLabel('Prénom').fill(opts.firstName);
  await page.getByLabel('Pseudo').fill(nickname);
  if (opts.photo) {
    await page.getByTestId('photo-input').setInputFiles(opts.photo);
    await expect(page.getByText('métadonnées supprimées')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Créer mon espace' }).click();
  await expect(page.getByRole('heading', { name: `Bienvenue, ${nickname} ! 👋` })).toBeVisible();
}
