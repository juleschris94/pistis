import type { Language } from '../features/settings/settings';
import type { CategoryId } from './categories';
import type { VisionArtId } from './visionArts';

/**
 * Bibliothèque de modèles de projets (données structurées et versionnées).
 *
 * - Un modèle est copié au moment de la création : l'utilisateur modifie ou supprime librement
 *   chaque étape et chaque tâche, et une mise à jour du modèle ne touche jamais ses projets.
 * - `version` augmente à chaque modification du contenu d'un modèle ; le projet retient la version utilisée.
 * - Aucune obligation officielle n'est inventée : les démarches restent génériques et personnalisables.
 */
type Text = Record<Language, string>;

export interface GoalTemplate {
  id: string;
  version: number;
  category: CategoryId;
  art: VisionArtId;
  title: Text;
  description: Text;
  /** Résultat attendu, proposé comme vision. */
  objective: Text;
  /** Exemples de Pourquoi : l'utilisateur en choisit un ou écrit le sien. */
  whyExamples: Text[];
  /** Fréquence suggérée pour avancer. */
  frequency: Text;
  /** Comment mesurer la progression. */
  indicator: Text;
  milestones: { title: Text; tasks: Text[] }[];
}

const t = (fr: string, en: string): Text => ({ fr, en });

export const TEMPLATES: GoalTemplate[] = [
  {
    id: 'start-business',
    version: 1,
    category: 'projects',
    art: 'city',
    title: t('Créer mon entreprise', 'Start my business'),
    description: t('De l’idée à la première vente, étape par étape.', 'From idea to first sale, step by step.'),
    objective: t('Mon activité est lancée et je réalise mes premières ventes.', 'My business is launched and I make my first sales.'),
    whyExamples: [
      t(
        'Construire une activité qui correspond à mes compétences et gagner en autonomie.',
        'Build a business that fits my skills and gain independence.',
      ),
      t('Créer quelque chose qui m’appartient et qui a du sens pour moi.', 'Create something that is mine and meaningful to me.'),
    ],
    frequency: t('3 séances de 1 h par semaine', '3 one-hour sessions per week'),
    indicator: t('Étapes franchies et premières ventes réalisées', 'Steps completed and first sales made'),
    milestones: [
      {
        title: t('Clarifier l’idée', 'Clarify the idea'),
        tasks: [
          t('Écrire ma proposition de valeur en une phrase', 'Write my value proposition in one sentence'),
          t('Décrire mon client idéal', 'Describe my ideal customer'),
          t('Lister 3 concurrents et ce qui me distingue', 'List 3 competitors and what sets me apart'),
        ],
      },
      {
        title: t('Tester le marché', 'Test the market'),
        tasks: [
          t('Interroger 5 clients potentiels', 'Interview 5 potential customers'),
          t('Fixer un premier prix', 'Set a first price'),
          t('Préparer une offre de lancement', 'Prepare a launch offer'),
        ],
      },
      {
        title: t('Structurer', 'Set up'),
        tasks: [
          t('Comparer les statuts juridiques possibles', 'Compare possible legal structures'),
          t('Estimer mes charges du premier mois', 'Estimate my first-month costs'),
          t('Effectuer les formalités de création', 'Complete the registration formalities'),
        ],
      },
      {
        title: t('Lancer', 'Launch'),
        tasks: [
          t('Créer une première présence en ligne', 'Create a first online presence'),
          t('Contacter mes 10 premiers prospects', 'Contact my first 10 prospects'),
          t('Réaliser ma première vente', 'Make my first sale'),
        ],
      },
    ],
  },
  {
    id: 'career-project',
    version: 1,
    category: 'projects',
    art: 'road',
    title: t('Préparer un projet professionnel', 'Prepare a career move'),
    description: t('Changer de poste, évoluer ou se reconvertir avec un plan clair.', 'Change role, grow or retrain with a clear plan.'),
    objective: t('Je suis prêt à candidater au poste qui me correspond.', 'I am ready to apply for the role that suits me.'),
    whyExamples: [
      t('Exercer un métier qui me motive au quotidien.', 'Do work that motivates me every day.'),
      t('Progresser et mieux valoriser mes compétences.', 'Grow and get better recognition for my skills.'),
    ],
    frequency: t('2 h par semaine', '2 hours per week'),
    indicator: t('Étapes franchies et candidatures envoyées', 'Steps completed and applications sent'),
    milestones: [
      {
        title: t('Faire le point', 'Take stock'),
        tasks: [
          t('Lister mes compétences et réussites', 'List my skills and achievements'),
          t('Définir le poste visé', 'Define the target role'),
        ],
      },
      {
        title: t('Se préparer', 'Get ready'),
        tasks: [
          t('Mettre à jour mon CV', 'Update my CV'),
          t('Identifier une formation utile', 'Identify a useful training course'),
          t('Échanger avec 3 personnes du métier', 'Talk to 3 people in the field'),
        ],
      },
      {
        title: t('Candidater', 'Apply'),
        tasks: [
          t('Repérer 10 offres ou entreprises', 'Find 10 openings or companies'),
          t('Envoyer mes premières candidatures', 'Send my first applications'),
          t('Préparer mes entretiens', 'Prepare for interviews'),
        ],
      },
    ],
  },
  {
    id: 'read-book',
    version: 1,
    category: 'habits',
    art: 'library',
    title: t('Lire un livre', 'Read a book'),
    description: t('Aller au bout d’un livre qui compte pour toi.', 'Finish a book that matters to you.'),
    objective: t('J’ai terminé ce livre et j’en ai retenu l’essentiel.', 'I have finished this book and kept the key ideas.'),
    whyExamples: [
      t('Développer mes connaissances et les appliquer à mes projets.', 'Grow my knowledge and apply it to my projects.'),
      t('Prendre un moment calme pour moi chaque jour.', 'Take a calm moment for myself every day.'),
    ],
    frequency: t('20 pages par jour', '20 pages a day'),
    indicator: t('Pages lues sur le total', 'Pages read out of the total'),
    milestones: [
      {
        title: t('Commencer', 'Start'),
        tasks: [
          t('Choisir le livre', 'Choose the book'),
          t('Prévoir un moment de lecture dans ma journée', 'Plan a reading time in my day'),
        ],
      },
      {
        title: t('Lire', 'Read'),
        tasks: [
          t('Lire le premier quart', 'Read the first quarter'),
          t('Lire la moitié', 'Read half'),
          t('Terminer le livre', 'Finish the book'),
        ],
      },
      {
        title: t('Retenir', 'Remember'),
        tasks: [t('Noter les 3 idées que je veux appliquer', 'Write down 3 ideas I want to apply')],
      },
    ],
  },
  {
    id: 'exercise',
    version: 1,
    category: 'habits',
    art: 'summit',
    title: t('Faire du sport', 'Exercise regularly'),
    description: t('Installer une activité physique à ton rythme.', 'Build a physical activity at your own pace.'),
    objective: t('Le sport fait naturellement partie de ma semaine.', 'Exercise is a natural part of my week.'),
    whyExamples: [
      t('Avoir plus d’énergie au quotidien.', 'Have more energy every day.'),
      t('Prendre soin de ma santé sur le long terme.', 'Take care of my health in the long run.'),
    ],
    frequency: t('3 séances de 30 min par semaine', '3 sessions of 30 min per week'),
    indicator: t('Séances réalisées sur séances prévues', 'Sessions done out of sessions planned'),
    milestones: [
      {
        title: t('Préparer', 'Prepare'),
        tasks: [
          t('Choisir une activité qui me plaît', 'Choose an activity I enjoy'),
          t('Fixer mes créneaux de la semaine', 'Set my weekly time slots'),
          t('Préparer ma tenue et mon matériel', 'Get my gear ready'),
        ],
      },
      {
        title: t('Démarrer', 'Get going'),
        tasks: [t('Faire ma première séance', 'Do my first session'), t('Tenir une semaine complète', 'Keep it up for a full week')],
      },
      {
        title: t('Installer l’habitude', 'Make it a habit'),
        tasks: [t('Tenir quatre semaines', 'Keep it up for four weeks'), t('Faire le point sur mes progrès', 'Review my progress')],
      },
    ],
  },
  {
    id: 'budget',
    version: 1,
    category: 'finance',
    art: 'horizon',
    title: t('Préparer un budget', 'Set up a budget'),
    description: t('Savoir où va ton argent et décider où il doit aller.', 'Know where your money goes and decide where it should go.'),
    objective: t('Mon budget mensuel est clair et je le suis.', 'My monthly budget is clear and I stick to it.'),
    whyExamples: [
      t('Être serein en fin de mois.', 'Feel calm at the end of the month.'),
      t('Dégager de quoi financer mes projets.', 'Free up money to fund my projects.'),
    ],
    frequency: t('30 min par semaine', '30 min per week'),
    indicator: t('Étapes franchies', 'Steps completed'),
    milestones: [
      {
        title: t('Observer', 'Observe'),
        tasks: [
          t('Lister mes revenus réguliers', 'List my regular income'),
          t('Lister mes charges fixes', 'List my fixed costs'),
          t('Relever mes dépenses du dernier mois', 'Review last month’s spending'),
        ],
      },
      {
        title: t('Décider', 'Decide'),
        tasks: [
          t('Fixer un montant par catégorie', 'Set an amount per category'),
          t('Prévoir une somme pour l’épargne', 'Plan an amount for savings'),
        ],
      },
      {
        title: t('Suivre', 'Follow up'),
        tasks: [
          t('Faire un point chaque semaine pendant un mois', 'Check in weekly for a month'),
          t('Ajuster le budget le mois suivant', 'Adjust the budget the following month'),
        ],
      },
    ],
  },
  {
    id: 'savings',
    version: 1,
    category: 'finance',
    art: 'horizon',
    title: t('Constituer une épargne', 'Build up savings'),
    description: t('Mettre de côté régulièrement pour un objectif précis.', 'Set money aside regularly for a clear goal.'),
    objective: t('J’ai atteint le montant d’épargne que je me suis fixé.', 'I have reached the savings amount I set myself.'),
    whyExamples: [
      t('Faire face à un imprévu sans stress.', 'Handle the unexpected without stress.'),
      t('Financer un projet important sans m’endetter.', 'Fund an important project without debt.'),
    ],
    frequency: t('Un versement chaque mois', 'One transfer every month'),
    indicator: t('Montant épargné sur montant visé (module Finances)', 'Amount saved out of the target (Finances module)'),
    milestones: [
      {
        title: t('Définir', 'Define'),
        tasks: [
          t('Choisir le montant visé', 'Choose the target amount'),
          t('Choisir la date souhaitée', 'Choose the target date'),
          t('Calculer le versement mensuel nécessaire', 'Work out the monthly amount needed'),
        ],
      },
      {
        title: t('Mettre en place', 'Set up'),
        tasks: [
          t('Choisir où placer cette épargne', 'Choose where to keep these savings'),
          t('Programmer un virement automatique', 'Schedule an automatic transfer'),
        ],
      },
      {
        title: t('Tenir', 'Keep going'),
        tasks: [t('Faire le point après trois mois', 'Review after three months')],
      },
    ],
  },
  {
    id: 'buy-car',
    version: 1,
    category: 'finance',
    art: 'road',
    title: t('Acheter une voiture', 'Buy a car'),
    description: t('Choisir, financer et acheter sans précipitation.', 'Choose, fund and buy without rushing.'),
    objective: t('J’ai la voiture qui correspond à mes besoins et à mon budget.', 'I have the car that fits my needs and budget.'),
    whyExamples: [
      t('Gagner en autonomie pour mes déplacements professionnels et personnels.', 'Gain independence for work and personal travel.'),
      t('Me déplacer en sécurité avec ma famille.', 'Travel safely with my family.'),
    ],
    frequency: t('1 h par semaine', '1 hour per week'),
    indicator: t('Étapes franchies et montant réuni', 'Steps completed and amount saved'),
    milestones: [
      {
        title: t('Définir le besoin', 'Define the need'),
        tasks: [
          t('Lister mes critères indispensables', 'List my must-have criteria'),
          t('Fixer mon budget total, assurance comprise', 'Set my total budget, insurance included'),
        ],
      },
      {
        title: t('Financer', 'Fund'),
        tasks: [
          t('Réunir l’apport prévu', 'Gather the planned deposit'),
          t('Comparer les solutions de financement', 'Compare financing options'),
        ],
      },
      {
        title: t('Choisir et acheter', 'Choose and buy'),
        tasks: [
          t('Essayer au moins 3 véhicules', 'Test drive at least 3 cars'),
          t('Faire vérifier le véhicule choisi', 'Have the chosen car inspected'),
          t('Assurer le véhicule', 'Insure the car'),
        ],
      },
    ],
  },
  {
    id: 'move-house',
    version: 1,
    category: 'housing',
    art: 'home',
    title: t('Préparer un déménagement', 'Plan a move'),
    description: t(
      'Un déménagement organisé, sans oubli de dernière minute.',
      'An organised move, with nothing forgotten at the last minute.',
    ),
    objective: t(
      'Je suis installé dans mon nouveau logement, tout est en ordre.',
      'I am settled in my new home and everything is in order.',
    ),
    whyExamples: [
      t('Commencer ce nouveau chapitre sereinement.', 'Start this new chapter calmly.'),
      t('Éviter le stress et les frais imprévus.', 'Avoid stress and unexpected costs.'),
    ],
    frequency: t('Un peu chaque semaine pendant 6 semaines', 'A little each week for 6 weeks'),
    indicator: t('Étapes franchies', 'Steps completed'),
    milestones: [
      {
        title: t('Organiser', 'Organise'),
        tasks: [
          t('Fixer la date du déménagement', 'Set the moving date'),
          t('Demander des devis ou réserver un véhicule', 'Get quotes or book a van'),
          t('Prévenir mon propriétaire si nécessaire', 'Notify my landlord if needed'),
        ],
      },
      {
        title: t('Prévenir', 'Notify'),
        tasks: [
          t('Lister les organismes à informer du changement d’adresse', 'List the organisations to notify of the new address'),
          t('Transférer ou résilier les contrats d’énergie et d’internet', 'Transfer or cancel energy and internet contracts'),
        ],
      },
      {
        title: t('Déménager', 'Move'),
        tasks: [
          t('Trier et donner ce que je ne garde pas', 'Sort and give away what I’m not keeping'),
          t('Préparer les cartons pièce par pièce', 'Pack room by room'),
          t('Faire l’état des lieux', 'Do the inventory check'),
        ],
      },
    ],
  },
  {
    id: 'find-home',
    version: 1,
    category: 'housing',
    art: 'home',
    title: t('Rechercher un logement', 'Find a place to live'),
    description: t('Trouver un logement adapté, dossier prêt à l’avance.', 'Find the right home, with your file ready in advance.'),
    objective: t('J’ai signé pour un logement qui me convient.', 'I have signed for a home that suits me.'),
    whyExamples: [
      t('Vivre dans un endroit où je me sens bien.', 'Live somewhere I feel good.'),
      t('Me rapprocher de mon travail ou de mes proches.', 'Be closer to work or my loved ones.'),
    ],
    frequency: t('Quelques recherches chaque jour', 'A few searches every day'),
    indicator: t('Étapes franchies et visites réalisées', 'Steps completed and viewings done'),
    milestones: [
      {
        title: t('Définir', 'Define'),
        tasks: [
          t('Fixer mon budget mensuel maximum', 'Set my maximum monthly budget'),
          t('Choisir les quartiers et critères', 'Choose areas and criteria'),
        ],
      },
      {
        title: t('Préparer le dossier', 'Prepare my file'),
        tasks: [
          t('Rassembler les justificatifs demandés', 'Gather the requested documents'),
          t('Préparer une version numérique du dossier', 'Prepare a digital copy of my file'),
        ],
      },
      {
        title: t('Visiter et choisir', 'Visit and choose'),
        tasks: [
          t('Programmer mes premières visites', 'Book my first viewings'),
          t('Comparer les logements visités', 'Compare the places visited'),
          t('Déposer mon dossier', 'Submit my application'),
        ],
      },
    ],
  },
  {
    id: 'admin-paperwork',
    version: 1,
    category: 'admin',
    art: 'library',
    title: t('Organiser mes démarches administratives', 'Organise my paperwork'),
    description: t('Retrouver chaque document et ne plus rater une échéance.', 'Find every document and never miss a deadline.'),
    objective: t('Mes papiers sont classés et mes échéances sont anticipées.', 'My papers are filed and my deadlines are anticipated.'),
    whyExamples: [
      t('Ne plus stresser à chaque courrier.', 'Stop stressing over every letter.'),
      t('Gagner du temps quand un document est demandé.', 'Save time when a document is requested.'),
    ],
    frequency: t('30 min par semaine', '30 min per week'),
    indicator: t('Étapes franchies', 'Steps completed'),
    milestones: [
      {
        title: t('Rassembler', 'Gather'),
        tasks: [
          t('Réunir mes papiers en un seul endroit', 'Gather my papers in one place'),
          t('Lister les démarches en cours', 'List the ongoing procedures'),
        ],
      },
      {
        title: t('Classer', 'File'),
        tasks: [
          t('Créer un classement par thème', 'Create a filing system by topic'),
          t('Numériser les documents importants', 'Scan the important documents'),
        ],
      },
      {
        title: t('Anticiper', 'Plan ahead'),
        tasks: [
          t('Noter les prochaines échéances connues', 'Note the next known deadlines'),
          t('Prévoir un rendez-vous mensuel avec mes papiers', 'Schedule a monthly paperwork session'),
        ],
      },
    ],
  },
];

export function findTemplate(id: string | null | undefined): GoalTemplate | undefined {
  return TEMPLATES.find((tpl) => tpl.id === id);
}

export function templateTaskCount(tpl: GoalTemplate): number {
  return tpl.milestones.reduce((n, m) => n + m.tasks.length, 0);
}
