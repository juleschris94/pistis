import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createProfile, fixture, nav, useDownloadsForBackups, watchPage } from './helpers';

const PASSWORD = 'mot-de-passe-test';

test.beforeEach(async ({ context }) => {
  await useDownloadsForBackups(context);
});

test('bienvenue : lisible, sans compte, aucune requête externe, politique de sécurité active', async ({ page }) => {
  const watch = watchPage(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'PISTIS' })).toBeVisible();
  await expect(page.getByText('pas de compte, pas d’e-mail, pas de cloud')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
  watch.assertClean();
});

test('accueil : besoins, validation, photo nettoyée, domaines retenus', async ({ page }) => {
  const watch = watchPage(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Commencer' }).click();

  // Étape 1 : besoins. Tout désélectionner bloque « Suivant ».
  const tiles = page.getByRole('group', { name: 'Quels sont tes principaux besoins ?' }).getByRole('button');
  await expect(tiles).toHaveCount(6);
  for (const tile of await tiles.all()) await tile.click();
  await expect(page.getByRole('button', { name: 'Suivant' })).toBeDisabled();
  await page.getByRole('button', { name: 'Projets et carrière', exact: true }).click();
  await page.getByRole('button', { name: 'Finances et épargne', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Projets et carrière', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Suivant' }).click();

  // Étape 2 : profil. Pseudo manquant → erreur sur le champ, focus dessus.
  await page.getByRole('button', { name: 'Créer mon espace' }).click();
  const pseudo = page.getByLabel('Pseudo');
  await expect(pseudo).toHaveAttribute('aria-invalid', 'true');
  await expect(pseudo).toBeFocused();

  await page.getByTestId('photo-input').setInputFiles(fixture('photo.heic'));
  await expect(page.getByText('Format HEIC non pris en charge')).toBeVisible();
  await page.getByTestId('photo-input').setInputFiles(fixture('pas-une-image.png'));
  await expect(page.getByText('JPEG, PNG ou WebP uniquement')).toBeVisible();
  await page.getByTestId('photo-input').setInputFiles(fixture('photo-gps.jpg'));
  await expect(page.getByText('2048×1365 px, métadonnées supprimées')).toBeVisible();

  await page.getByLabel('Prénom').fill('Jules');
  await pseudo.fill('JC');
  await page.getByRole('button', { name: 'Créer mon espace' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour JC ! 👋' })).toBeVisible();

  // L'image stockée ne contient plus aucune métadonnée EXIF.
  const stored = await page.evaluate(async () => {
    const img = document.querySelector('.p-topbar img') as HTMLImageElement;
    const bytes = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
    return { exif: new TextDecoder('latin1').decode(bytes).includes('Exif'), width: img.naturalWidth, height: img.naturalHeight };
  });
  expect(stored).toEqual({ exif: false, width: 320, height: 213 });

  // Seuls les deux domaines choisis apparaissent dans « Ton espace ».
  const space = page.getByRole('region', { name: 'Ton espace' });
  await expect(space.getByRole('link')).toHaveCount(2);
  await expect(space.getByText('Démarches administratives')).toHaveCount(0);
  watch.assertClean();
});

test('navigation : 5 onglets, notifications, profil et retour', async ({ page }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC');
  for (const [tab, heading] of [
    ['Projets', 'Projets'],
    ['Planning', 'Ton planning arrive bientôt'],
    ['Suivis', 'Tes suivis arrivent bientôt'],
    ['Finances', 'Tes finances arrivent bientôt'],
  ]) {
    await nav(page, tab).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(nav(page, tab)).toHaveAttribute('aria-current', 'page');
  }
  await nav(page, 'Accueil').click();
  await page.getByRole('link', { name: 'Notifications' }).click();
  await expect(page.getByRole('heading', { name: 'Tout est calme' })).toBeVisible();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: 'Ouvrir mon profil et mes paramètres' }).click();
  await expect(page.getByRole('heading', { name: 'Profil et paramètres' })).toBeVisible();
  await page.getByRole('link', { name: /Modifier mon profil/ }).click();
  await page.getByLabel('Phrase personnelle (facultatif)').fill('Un pas après l’autre');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('« Un pas après l’autre »')).toBeVisible();
  watch.assertClean();
});

test('thème, animations et langue : appliqués tout de suite et conservés', async ({ page }) => {
  await createProfile(page, 'JC');
  await page.goto('./#/profil/apparence');
  await page.getByRole('radio', { name: 'Sombre' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Réduites' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.goto('./#/profil/langue');
  await page.getByRole('button', { name: /English/ }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await page.goto('./#/');
  await expect(page.getByRole('heading', { name: 'Hello JC! 👋' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});

test('données conservées, hors ligne, sauvegarde chiffrée, restauration ailleurs et annulation', async ({ page, context, browser }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC', { photo: fixture('photo-gps.jpg') });

  // Rechargement puis hors ligne : l'espace s'ouvre sans réseau.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bonjour JC ! 👋' })).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bonjour JC ! 👋' })).toBeVisible();

  // Diagnostic : base persistante, structure à jour, hors ligne, profil relu.
  await page.goto('./#/profil/confidentialite');
  await expect(page.getByText('dans le stockage privé du navigateur.')).toBeVisible();
  await expect(page.getByText('Version 3 sur 3.')).toBeVisible();
  await expect(page.getByText('hors ligne actuellement')).toBeVisible();
  await expect(page.getByText('relu depuis la base')).toBeVisible();

  // L'accueil propose la sauvegarde comme priorité du jour.
  await page.goto('./#/');
  await expect(page.getByText('Faire ta première sauvegarde').first()).toBeVisible();
  await page.getByRole('link', { name: 'Sauvegarder maintenant' }).click();
  await expect(page.getByText('Aucune sauvegarde pour l’instant.')).toBeVisible();

  // Mot de passe trop court refusé, puis export chiffré hors ligne.
  const passwordField = page.getByLabel('Mot de passe de la sauvegarde (facultatif)');
  await passwordField.fill('court');
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click();
  await expect(page.getByText('au moins 8 caractères')).toBeVisible();
  await passwordField.fill(PASSWORD);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^pistis-sauvegarde-\d{4}-\d{2}-\d{2}\.pistis$/);
  const archive = await readFile(await download.path());
  expect(archive.subarray(0, 10).toString()).toBe('PISTISENC1');
  await expect(page.getByText('Sauvegarde chiffrée enregistrée et vérifiée')).toBeVisible();
  await expect(page.getByText('Dernière sauvegarde aujourd’hui.')).toBeVisible();
  watch.assertClean();

  // Nouvel appareil : restauration dès l'écran de bienvenue.
  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  const watch2 = watchPage(page2);
  await page2.goto('./');
  await page2.getByRole('button', { name: 'Déjà un espace ? Restaurer une sauvegarde' }).click();
  const file = { name: download.suggestedFilename(), mimeType: 'application/octet-stream', buffer: archive };
  await page2.getByTestId('backup-file-input').setInputFiles(file);
  await expect(page2.getByText('chiffrée : saisis son mot de passe')).toBeVisible();
  await page2.getByLabel('Mot de passe de cette sauvegarde').fill('mauvais-mot-de-passe');
  await page2.getByRole('button', { name: 'Déverrouiller' }).click();
  await expect(page2.getByText('Mot de passe incorrect')).toBeVisible();
  await page2.getByLabel('Mot de passe de cette sauvegarde').fill(PASSWORD);
  await page2.getByRole('button', { name: 'Déverrouiller' }).click();
  await expect(page2.getByText('Sauvegarde valide')).toBeVisible();
  await page2.getByRole('button', { name: 'Restaurer mon espace' }).click();
  await expect(page2.getByRole('heading', { name: 'Bonjour JC ! 👋' })).toBeVisible();
  await expect(page2.locator('.p-topbar img')).toHaveCount(1);
  watch2.assertClean();
  await fresh.close();

  // Appareil déjà utilisé : restauration puis annulation.
  const other = await browser.newContext();
  const page3 = await other.newPage();
  await createProfile(page3, 'Autre');
  await page3.goto('./#/profil/sauvegardes');
  await page3.getByTestId('backup-file-input').setInputFiles(file);
  await page3.getByLabel('Mot de passe de cette sauvegarde').fill(PASSWORD);
  await page3.getByRole('button', { name: 'Déverrouiller' }).click();
  await page3.getByRole('button', { name: 'Remplacer mes données' }).click();
  await expect(page3.getByText('Restauration terminée.')).toBeVisible();
  await page3.getByRole('button', { name: 'Annuler la restauration' }).click();
  await expect(page3.getByText('tes données précédentes sont revenues')).toBeVisible();
  await page3.goto('./#/');
  await expect(page3.getByRole('heading', { name: 'Bonjour Autre ! 👋' })).toBeVisible();
  await other.close();
});

test('un seul onglet à la fois, avec reprise de la main', async ({ page, context }) => {
  await createProfile(page, 'JC');
  const second = await context.newPage();
  await second.goto('./');
  await expect(second.getByRole('heading', { name: 'PISTIS est déjà ouvert ailleurs' })).toBeVisible();

  await second.getByRole('button', { name: 'Continuer ici' }).click();
  await expect(second.getByRole('heading', { name: 'Bonjour JC ! 👋' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PISTIS est ouvert dans un autre onglet' })).toBeVisible();

  // Le second onglet écrit ; le premier, repris, voit la modification.
  await second.goto('./#/profil/modifier');
  await second.getByLabel('Pseudo').fill('Jules');
  await second.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(second.getByRole('heading', { name: 'Profil et paramètres' })).toBeVisible();
  await second.close();
  await page.getByRole('button', { name: 'Utiliser ici' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Jules ! 👋' })).toBeVisible();
});
