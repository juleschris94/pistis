import type { Language } from '../features/settings/settings';

/**
 * Messages d'encouragement originaux de PISTIS (aucune citation d'auteur : pas de droits à gérer,
 * pas d'attribution incertaine). Un message par jour, le même pour toute la journée.
 * Ton : bienveillant, jamais culpabilisant.
 */
export const ENCOURAGEMENTS: Record<Language, string[]> = {
  fr: [
    'Chaque petit pas te rapproche d’une grande réalisation.',
    'Avancer doucement, c’est toujours avancer.',
    'Ton Pourquoi est ta boussole : il reste là même les jours sans élan.',
    'Le repos fait partie du chemin, pas une sortie de route.',
    'Une chose à la fois. Celle d’aujourd’hui suffit.',
    'Ce que tu notes, tu n’as plus besoin de le retenir.',
    'Les grands projets sont faits de journées ordinaires.',
    'Regarde le chemin parcouru avant celui qui reste.',
    'Anticiper aujourd’hui, c’est respirer demain.',
    'Ton rythme est le bon rythme.',
  ],
  en: [
    'Every small step brings you closer to something great.',
    'Moving slowly is still moving forward.',
    'Your Why is your compass: it stays even on low-energy days.',
    'Rest is part of the journey, not a detour.',
    'One thing at a time. Today’s is enough.',
    'What you write down, you no longer have to remember.',
    'Big projects are made of ordinary days.',
    'Look at how far you have come before what is left.',
    'Planning ahead today means breathing easier tomorrow.',
    'Your pace is the right pace.',
  ],
};

/** Message du jour : stable pour une journée donnée. */
export function encouragementOfTheDay(language: Language, date: Date): string {
  const list = ENCOURAGEMENTS[language];
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return list[dayOfYear % list.length];
}
