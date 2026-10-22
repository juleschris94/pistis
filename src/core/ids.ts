/** Identifiant unique (UUID v4) pour toute ligne de la base. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Instant courant en millisecondes UTC. Injectable dans les tests via `Clock`. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
