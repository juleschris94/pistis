import { expect, test } from '@playwright/test';
import { createProfile, fixture, nav, watchPage } from './helpers';

test('finances : import CSV (Windows-1252, débit/crédit), réimport sans doublon, puis OFX avec solde', async ({ page }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC');
  await nav(page, 'Finances').click();
  await expect(page.getByRole('heading', { name: 'Ajoute ton premier relevé' })).toBeVisible();

  await page.getByRole('link', { name: 'Importer' }).first().click();
  await page.getByTestId('statement-input').setInputFiles(fixture('releve-exemple.csv'));
  await expect(page.getByText('5 opérations trouvées')).toBeVisible();
  await expect(page.getByLabel('Débit (sorties)')).toHaveValue('2');
  await page.getByLabel('Banque').selectOption('creditagricole');
  await page.getByLabel('Nom du compte').fill('Compte courant');
  await page.getByRole('button', { name: 'Importer 5 opérations' }).click();
  await expect(page.getByRole('heading', { name: '5 opérations ajoutées' })).toBeVisible();

  // Même fichier une deuxième fois : rien en double.
  await page.getByRole('button', { name: 'Importer un autre relevé' }).click();
  await page.getByTestId('statement-input').setInputFiles(fixture('releve-exemple.csv'));
  await page.getByRole('button', { name: 'Importer 5 opérations' }).click();
  await expect(page.getByRole('heading', { name: '0 opération ajoutée' })).toBeVisible();
  await expect(page.getByText('5 opérations étaient déjà là')).toBeVisible();

  // OFX : nouveau compte, solde lu dans le fichier.
  await page.getByRole('button', { name: 'Importer un autre relevé' }).click();
  await page.getByTestId('statement-input').setInputFiles(fixture('epargne-exemple.ofx'));
  await page.getByLabel('Compte', { exact: true }).selectOption({ label: 'Nouveau compte…' });
  await page.getByLabel('Type de compte').selectOption('savings');
  await page.getByRole('button', { name: 'Importer 2 opérations' }).click();
  await expect(page.getByText('Le solde du compte a été mis à jour')).toBeVisible();

  await page.getByRole('button', { name: 'Voir mes finances' }).click();
  const accounts = page.getByRole('region', { name: 'Mes comptes' });
  await expect(accounts.getByText('Compte courant')).toBeVisible();
  await expect(accounts.getByText('3 500,00 €')).toBeVisible();
  await expect(accounts.getByText('Solde inconnu')).toBeVisible();
  watch.assertClean();
});

test('planning : import .ics, événement répété du jour, itinéraire', async ({ page }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC');
  await nav(page, 'Planning').click();
  await expect(page.getByText('Aucun agenda importé')).toBeVisible();
  await page.getByTestId('agenda-input').setInputFiles(fixture('agenda-exemple.ics'));
  await expect(page.getByText('Agenda « Perso (exemple) » importé : 1 événement.')).toBeVisible();
  await expect(page.getByText('Lecture du soir')).toBeVisible();

  await page.getByRole('button', { name: 'Y aller' }).click();
  const google = page.getByRole('link', { name: 'Google Maps' });
  await expect(google).toHaveAttribute('href', /google\.com\/maps\/dir\/\?api=1&destination=M%C3%A9diath%C3%A8que/);
  await expect(page.getByRole('link', { name: 'Waze' })).toBeVisible();
  watch.assertClean();
});

test('connecteurs : statut honnête, jamais d’identifiants bancaires demandés', async ({ page }) => {
  await createProfile(page, 'JC');
  await page.goto('./#/profil/connecteurs');
  await expect(page.getByText('PISTIS ne te demandera jamais tes identifiants bancaires')).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
});
