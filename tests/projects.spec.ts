import { expect, test } from '@playwright/test';
import { createProfile, nav, watchPage } from './helpers';

test('modèle → assistant → projet : Pourquoi obligatoire, progression réelle, priorités du jour', async ({ page }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC');

  // Accueil sans projet : la priorité du jour invite à créer le premier projet.
  await page.getByRole('link', { name: /Choisir un modèle/ }).click();
  await page.getByRole('link', { name: /Créer mon entreprise/ }).click();
  await expect(page.getByText('Exemples de Pourquoi')).toBeVisible();
  await page.getByRole('link', { name: /Utiliser ce modèle/ }).click();

  // Étape 1 : objectif prérempli par le modèle.
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Créer mon entreprise');
  await page.getByRole('button', { name: 'Suivant' }).click();

  // Étape 2 : sans Pourquoi, on ne passe pas.
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByLabel('Mon Pourquoi')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Mon Pourquoi').fill('Gagner en autonomie avec un métier qui me ressemble.');
  await page.getByRole('button', { name: 'Suivant' }).click();

  // Étape 3 : la vision est présentée comme imaginée, jamais comme un résultat.
  await expect(page.getByText('Vision imaginée', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Suivant' }).click();

  // Étape 4 : plan modifiable avant création.
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  await expect(page.getByRole('heading', { name: 'Créer mon entreprise' })).toBeVisible();
  await expect(page.getByText('0 tâches terminées sur 12')).toBeVisible();

  // Cocher deux tâches : la progression suit exactement les tâches.
  await page.getByRole('checkbox', { name: 'Écrire ma proposition de valeur en une phrase' }).first().click();
  await page.getByRole('checkbox', { name: 'Décrire mon client idéal' }).first().click();
  await expect(page.getByText('2 tâches terminées sur 12')).toBeVisible();

  // Épingler une tâche : elle passe en tête des priorités du jour.
  await page
    .getByRole('button', { name: /Épingler « Fixer un premier prix »/ })
    .first()
    .click();
  await nav(page, 'Accueil').click();
  const priorities = page.getByRole('region', { name: 'Mes priorités du jour' });
  await expect(priorities.getByRole('checkbox').first()).toHaveAccessibleName('Fixer un premier prix');
  await expect(priorities.getByRole('checkbox')).toHaveCount(3);

  // Terminer une priorité depuis l'accueil.
  await priorities.getByRole('checkbox', { name: 'Fixer un premier prix' }).click();
  await expect(priorities.getByRole('checkbox', { name: 'Fixer un premier prix' })).toHaveCount(0);
  watch.assertClean();
});

test('ajout rapide : tâche sans projet pour aujourd’hui, puis idée transformée en projet', async ({ page }) => {
  const watch = watchPage(page);
  await createProfile(page, 'JC');

  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByRole('button', { name: /Tâche rapide/ }).click();
  await page.getByRole('button', { name: 'Ajouter la tâche' }).click();
  await expect(page.getByText('Écris la tâche à faire.')).toBeVisible();
  await page.getByLabel('Que dois-tu faire ?').fill('Appeler la banque');
  await page.getByRole('button', { name: 'Aujourd’hui' }).click();
  await page.getByRole('button', { name: 'Ajouter la tâche' }).click();
  const priorities = page.getByRole('region', { name: 'Mes priorités du jour' });
  await expect(priorities.getByRole('checkbox', { name: 'Appeler la banque' })).toBeVisible();

  // Une idée se note sans Pourquoi…
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByRole('button', { name: /Idée/ }).first().click();
  await page.getByLabel('Ton idée').fill('Ouvrir un café');
  await page.getByRole('button', { name: 'Enregistrer l’idée' }).click();
  await expect(page.getByRole('heading', { name: 'Ouvrir un café' })).toBeVisible();

  // … et devient un projet seulement avec un Pourquoi.
  await page.getByRole('link', { name: /En faire un projet/ }).click();
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Ouvrir un café');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByLabel('Mon Pourquoi').fill('Créer un lieu chaleureux dans mon quartier.');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Transformer en projet' }).click();
  await expect(page.getByText('Mon Pourquoi')).toBeVisible();

  await nav(page, 'Projets').click();
  await expect(page.getByRole('radio', { name: 'En cours · 1' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Idées · 0' })).toBeVisible();
  watch.assertClean();
});
