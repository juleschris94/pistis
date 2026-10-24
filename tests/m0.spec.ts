import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createProfile, fixture, useDownloadsForBackups, watchPage } from './helpers';

const PASSWORD = 'mot-de-passe-test';

test.beforeEach(async ({ context }) => {
  await useDownloadsForBackups(context);
});

test('accueil : bienvenue lisible, sans compte ni réseau externe', async ({ page }) => {
  const watch = watchPage(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'PISTIS' })).toBeVisible();
  await expect(page.getByText('pas de compte, pas d’e-mail, pas de cloud')).toBeVisible();
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
  watch.assertClean();
});

test('profil : validation, photo nettoyée, modification', async ({ page }) => {
  const watch = watchPage(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Commencer' }).click();

  // Pseudo manquant : erreur sur le champ, focus placé dessus.
  await page.getByRole('button', { name: 'Créer mon espace' }).click();
  const pseudo = page.getByLabel('Pseudo');
  await expect(pseudo).toHaveAttribute('aria-invalid', 'true');
  await expect(pseudo).toBeFocused();

  // Formats refusés avec un message clair.
  await page.getByTestId('photo-input').setInputFiles(fixture('photo.heic'));
  await expect(page.getByText('Format HEIC non pris en charge')).toBeVisible();
  await page.getByTestId('photo-input').setInputFiles(fixture('pas-une-image.png'));
  await expect(page.getByText('JPEG, PNG ou WebP uniquement')).toBeVisible();

  // Photo de 3000×2000 avec position GPS.
  await page.getByTestId('photo-input').setInputFiles(fixture('photo-gps.jpg'));
  await expect(page.getByText('2048×1365 px, métadonnées supprimées')).toBeVisible();
  await page.getByLabel('Prénom').fill('Jules');
  await pseudo.fill('JC');
  await page.getByRole('button', { name: 'Créer mon espace' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue, JC ! 👋' })).toBeVisible();

  // L'image réellement stockée ne contient plus aucune métadonnée EXIF.
  const stored = await page.evaluate(async () => {
    const img = document.querySelector('.p-header img') as HTMLImageElement;
    const bytes = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
    return { exif: new TextDecoder('latin1').decode(bytes).includes('Exif'), width: img.naturalWidth, height: img.naturalHeight };
  });
  expect(stored).toEqual({ exif: false, width: 320, height: 213 });

  // Modification du profil.
  await page.getByRole('button', { name: 'Modifier mon profil' }).click();
  await page.getByLabel('Phrase personnelle (facultatif)').fill('Un pas après l’autre');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Un pas après l’autre')).toBeVisible();
  watch.assertClean();
});

test('données conservées, hors ligne, sauvegarde chiffrée et restauration ailleurs', async ({ page, context, browser }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC', { photo: fixture('photo-gps.jpg') });

  // Rechargement : relu depuis la base persistante.
  await page.reload();
  await expect(page.getByText('relu depuis la base')).toBeVisible();
  await expect(page.getByText('SQLite dans le stockage privé du navigateur (OPFS)')).toBeVisible();
  await expect(page.getByText('Schéma en version 2 sur 2')).toBeVisible();

  // Hors ligne : l'application et les données s'ouvrent sans réseau.
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bienvenue, JC ! 👋' })).toBeVisible();
  await expect(page.getByText('hors ligne actuellement')).toBeVisible();

  // Rappel : aucune sauvegarde au départ.
  await expect(page.getByText('Aucune sauvegarde pour l’instant')).toBeVisible();

  // Mot de passe trop court refusé avant tout export.
  await page.getByLabel('Mot de passe de la sauvegarde (facultatif)').fill('court');
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click();
  await expect(page.getByText('au moins 8 caractères')).toBeVisible();

  // Export chiffré, hors ligne.
  await page.getByLabel('Mot de passe de la sauvegarde (facultatif)').fill(PASSWORD);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^pistis-sauvegarde-\d{4}-\d{2}-\d{2}\.pistis$/);
  const archivePath = test.info().outputPath(download.suggestedFilename());
  await download.saveAs(archivePath);
  const archive = await readFile(archivePath);
  expect(archive.subarray(0, 10).toString()).toBe('PISTISENC1');
  await expect(page.getByText('enregistrée et vérifiée')).toBeVisible();
  await expect(page.getByText('Dernière sauvegarde aujourd’hui.')).toBeVisible();
  await expect(page.getByText('Vérifications du jalon M0 · 6/7')).toBeVisible();
  watch.assertClean();

  // Restauration dans un navigateur vierge (« autre appareil »).
  const other = await browser.newContext();
  await useDownloadsForBackups(other);
  const page2 = await other.newPage();
  const watch2 = watchPage(page2);
  await createProfile(page2, 'Autre');
  // Contenu passé directement : le dossier de test contient des accents que Chromium lit mal.
  await page2
    .getByTestId('backup-file-input')
    .setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/octet-stream', buffer: archive });
  await expect(page2.getByText('chiffrée : saisis son mot de passe')).toBeVisible();
  await page2.getByLabel('Mot de passe de cette sauvegarde').fill('mauvais-mot-de-passe');
  await page2.getByRole('button', { name: 'Déverrouiller' }).click();
  await expect(page2.getByText('Mot de passe incorrect')).toBeVisible();
  await page2.getByLabel('Mot de passe de cette sauvegarde').fill(PASSWORD);
  await page2.getByRole('button', { name: 'Déverrouiller' }).click();
  await expect(page2.getByText('Sauvegarde valide')).toBeVisible();
  await page2.getByRole('button', { name: 'Remplacer mes données' }).click();
  await expect(page2.getByRole('heading', { name: 'Bienvenue, JC ! 👋' })).toBeVisible();
  await expect(page2.locator('.p-header img')).toHaveCount(1);

  // Annulation de la restauration : retour au profil précédent.
  await page2.getByRole('button', { name: 'Annuler la restauration' }).click();
  await expect(page2.getByRole('heading', { name: 'Bienvenue, Autre ! 👋' })).toBeVisible();
  await expect(page2.locator('.p-header img')).toHaveCount(0);
  watch2.assertClean();
  await other.close();
});

test('un seul onglet à la fois, avec reprise de la main', async ({ page, context }) => {
  await createProfile(page, 'JC');
  const second = await context.newPage();
  await second.goto('./');
  await expect(second.getByRole('heading', { name: 'PISTIS est déjà ouvert ailleurs' })).toBeVisible();

  await second.getByRole('button', { name: 'Continuer ici' }).click();
  await expect(second.getByRole('heading', { name: 'Bienvenue, JC ! 👋' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PISTIS est ouvert dans un autre onglet' })).toBeVisible();

  // Le second onglet écrit ; le premier, repris, voit la modification.
  await second.getByRole('button', { name: 'Modifier mon profil' }).click();
  await second.getByLabel('Pseudo').fill('Jules');
  await second.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(second.getByRole('heading', { name: 'Bienvenue, Jules ! 👋' })).toBeVisible();
  await second.close();
  await page.getByRole('button', { name: 'Utiliser ici' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue, Jules ! 👋' })).toBeVisible();
});
