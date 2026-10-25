import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

/**
 * Google Agenda de bout en bout, sans compte réel : les serveurs de Google sont simulés.
 * Vérifie l'aller (adresse de connexion), le retour (jeton lu puis effacé de l'adresse),
 * la synchronisation et l'affichage dans le Planning.
 */
test('Google Agenda : connexion, retour, synchronisation, Planning', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'JC');

  // Aller : l'adresse de connexion demande la lecture seule et revient exactement sur l'application.
  let authRequest: URL | null = null;
  await page.route('https://accounts.google.com/**', async (route) => {
    authRequest = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<p>Google (simulé)</p>' });
  });
  await page.goto('./#/profil/connecteurs/google');
  await page.getByRole('button', { name: 'Se connecter à Google' }).click();
  await expect(page.getByText('Google (simulé)')).toBeVisible();
  expect(authRequest).not.toBeNull();
  const params = Object.fromEntries(authRequest!.searchParams);
  expect(params).toMatchObject({
    client_id: 'e2e-test.apps.googleusercontent.com',
    redirect_uri: 'http://localhost:4173/',
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  });

  // Agenda simulé : un événement aujourd'hui à 23 h, avec une adresse.
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const offset = -today.getTimezoneOffset();
  const tz = `${offset >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
  await page.route('https://www.googleapis.com/**', async (route) => {
    const url = route.request().url();
    expect(route.request().headers().authorization).toBe('Bearer JETON-SIMULE');
    if (url.includes('calendarList'))
      return route.fulfill({
        json: {
          items: [
            { id: 'jc@gmail.com', summary: 'jc@gmail.com', primary: true },
            { id: 'pro', summary: 'Travail' },
          ],
        },
      });
    return route.fulfill({
      json: {
        items: [
          {
            id: 'e1',
            summary: 'Point hebdo',
            location: '5 avenue Foch, Lyon',
            start: { dateTime: `${ymd}T23:00:00${tz}` },
            end: { dateTime: `${ymd}T23:30:00${tz}` },
          },
          { id: 'e2', status: 'cancelled', start: { dateTime: `${ymd}T08:00:00${tz}` } },
        ],
      },
    });
  });

  // Retour de Google : le jeton est lu, puis retiré de l'adresse.
  await page.goto(
    `./#access_token=JETON-SIMULE&token_type=Bearer&expires_in=3599&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')}&state=${params.state}`,
  );
  await expect(page.getByText('Google Agenda est connecté')).toBeVisible();
  expect(page.url()).not.toContain('access_token');
  expect(page.url()).toContain('#/profil/connecteurs/google');

  await expect(page.getByRole('button', { name: 'jc@gmail.com' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Travail' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Enregistrer et synchroniser' }).click();
  await expect(page.getByText('1 événement copié depuis 1 agenda(s).')).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Planning', exact: true }).click();
  await expect(page.getByText('Point hebdo')).toBeVisible();
  await expect(page.getByText('Google · jc@gmail.com').first()).toBeVisible();

  // Un retour falsifié (état inconnu) n'est jamais accepté.
  await page.goto('about:blank');
  await page.goto('./#access_token=VOLE&state=inconnu');
  await expect(page).toHaveURL(/#\/planning$/);
  expect(await page.evaluate(() => sessionStorage.getItem('pistis-google-token'))).toContain('JETON-SIMULE');
  expect(errors).toEqual([]);
});
