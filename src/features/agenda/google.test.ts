import { describe, expect, it } from 'vitest';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { agendaBetween, listCalendars } from './agendaRepository';
import { authUrl, consumeOAuthRedirect, currentGoogleToken, GOOGLE_SCOPE, redirectUri, takeGoogleAuthResult } from './googleAuth';
import {
  disconnectGoogle,
  fetchGoogleCalendars,
  getGoogleSelection,
  mapGoogleEvent,
  saveGoogleSelection,
  syncGoogle,
} from './googleCalendar';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const pending = (store: Storage, state = 'abc') =>
  store.setItem('pistis-google-pending', JSON.stringify({ state, returnTo: '#/planning' }));

describe('connexion Google (navigateur)', () => {
  it('adresse de connexion : lecture seule, adresse de retour exacte, mode silencieux', () => {
    const url = new URL(authUrl({ state: 's1', silent: true, redirect: 'https://juleschris94.github.io/pistis/', clientId: 'id.apps' }));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'id.apps',
      redirect_uri: 'https://juleschris94.github.io/pistis/',
      response_type: 'token',
      scope: GOOGLE_SCOPE,
      state: 's1',
      prompt: 'none',
    });
    expect(redirectUri({ origin: 'https://juleschris94.github.io', pathname: '/pistis/' })).toBe('https://juleschris94.github.io/pistis/');
  });

  it('retour valide : jeton gardé une heure dans l’onglet, adresse nettoyée vers l’écran d’origine', () => {
    const store = new MemoryStorage();
    pending(store);
    const now = 1_000_000;
    const r = consumeOAuthRedirect(
      `#access_token=TOKEN&token_type=Bearer&expires_in=3599&scope=${encodeURIComponent(GOOGLE_SCOPE)}&state=abc`,
      store,
      now,
    );
    expect(r).toEqual({ handled: true, returnTo: '#/planning' });
    expect(currentGoogleToken(store, now)).toEqual({ accessToken: 'TOKEN', expiresAt: now + 3_599_000 });
    expect(currentGoogleToken(store, now + 3_599_000)).toBeNull();
    expect(takeGoogleAuthResult(store)).toEqual({ ok: true });
    expect(takeGoogleAuthResult(store)).toBeNull();
  });

  it('refuse un retour dont l’état ne correspond pas (protection contre la falsification)', () => {
    const store = new MemoryStorage();
    pending(store, 'attendu');
    consumeOAuthRedirect('#access_token=VOLE&state=autre', store);
    expect(currentGoogleToken(store)).toBeNull();
    expect(takeGoogleAuthResult(store)).toEqual({ ok: false, error: 'state' });
  });

  it('refus ou connexion requise : erreur transmise, aucun jeton', () => {
    const store = new MemoryStorage();
    pending(store);
    consumeOAuthRedirect('#error=interaction_required&state=abc', store);
    expect(takeGoogleAuthResult(store)).toEqual({ ok: false, error: 'interaction_required' });
    expect(consumeOAuthRedirect('#/planning', store)).toEqual({ handled: false });
  });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Google Agenda → base locale', () => {
  it('événement daté, journée entière, annulé', () => {
    expect(
      mapGoogleEvent({
        id: '1',
        summary: 'Dentiste',
        start: { dateTime: '2026-10-27T10:00:00+01:00' },
        end: { dateTime: '2026-10-27T10:30:00+01:00' },
      }),
    ).toMatchObject({
      allDay: false,
      start: Date.parse('2026-10-27T09:00:00Z'),
      end: Date.parse('2026-10-27T09:30:00Z'),
    });
    expect(mapGoogleEvent({ id: '2', start: { date: '2026-11-01' }, end: { date: '2026-11-02' } })).toMatchObject({
      allDay: true,
      start: Date.UTC(2026, 10, 1),
      end: Date.UTC(2026, 10, 2),
    });
    expect(mapGoogleEvent({ id: '3', status: 'cancelled', start: { date: '2026-11-01' } })).toBeNull();
  });

  it('synchronise les agendas choisis (pages comprises), remplace la copie, décocher supprime', async () => {
    const db = await createMemoryDatabase();
    await migrate(db);
    const calls: string[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push(url);
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer T');
      if (url.includes('calendarList'))
        return json({
          items: [
            { id: 'jc@gmail.com', summary: 'jc@gmail.com', primary: true },
            { id: 'travail', summary: 'Travail' },
          ],
        });
      if (!url.includes('pageToken'))
        return json({
          items: [
            { id: 'a', summary: 'Sport', start: { dateTime: '2026-10-27T18:00:00+01:00' }, end: { dateTime: '2026-10-27T19:00:00+01:00' } },
          ],
          nextPageToken: 'p2',
        });
      return json({ items: [{ id: 'b', summary: 'Congés', start: { date: '2026-10-28' }, end: { date: '2026-10-30' } }] });
    };
    const calendars = await fetchGoogleCalendars('T', fetcher);
    expect(calendars.map((c) => c.name)).toEqual(['jc@gmail.com', 'Travail']);
    await saveGoogleSelection(db, 'jc@gmail.com', [{ id: 'jc@gmail.com', name: 'jc@gmail.com' }]);
    const clock = { now: () => Date.UTC(2026, 9, 25) };
    expect(await syncGoogle(db, 'T', fetcher, clock)).toEqual({ events: 2, calendars: 1 });
    await syncGoogle(db, 'T', fetcher, clock);
    expect(await listCalendars(db)).toEqual([
      expect.objectContaining({ name: 'Google · jc@gmail.com', file_name: 'google:jc@gmail.com', event_count: 2 }),
    ]);
    expect((await agendaBetween(db, Date.UTC(2026, 9, 26), Date.UTC(2026, 10, 2))).map((i) => i.title)).toEqual(['Congés', 'Sport']);
    expect((await getGoogleSelection(db)).lastSync).toBe(clock.now());

    await saveGoogleSelection(db, 'jc@gmail.com', []);
    expect(await listCalendars(db)).toEqual([]);
    await disconnectGoogle(db);
    expect(await getGoogleSelection(db)).toEqual({ account: null, calendars: [], lastSync: null });
  });

  it('jeton expiré ou accès refusé : erreurs claires', async () => {
    await expect(fetchGoogleCalendars('T', async () => json({}, 401))).rejects.toMatchObject({ code: 'google.expired' });
    await expect(fetchGoogleCalendars('T', async () => json({}, 403))).rejects.toMatchObject({ code: 'google.forbidden' });
    await expect(
      fetchGoogleCalendars('T', async () => {
        throw new TypeError('offline');
      }),
    ).rejects.toMatchObject({ code: 'google.network' });
  });
});
