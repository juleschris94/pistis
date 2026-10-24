/**
 * Dates civiles (échéances, « aujourd'hui ») au format AAAA-MM-JJ, en heure LOCALE.
 * Une date civile n'a pas d'heure : la stocker en texte évite les décalages de fuseau horaire.
 */
export type LocalDate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(value: LocalDate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toLocalDate(parseLocalDate(value)) === value;
}

/** Nombre de jours de `from` à `to` (négatif si `to` est passé). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000);
}
