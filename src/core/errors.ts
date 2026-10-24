/**
 * Erreurs prévues de PISTIS.
 *
 * La logique ne contient aucun texte destiné à l'utilisateur : elle lève un code (et ses paramètres),
 * et l'interface le traduit dans la langue choisie (`errors.<code>` dans src/i18n).
 */
export const ERROR_CODES = [
  'image.empty',
  'image.tooHeavy',
  'image.heic',
  'image.unsupported',
  'image.unreadable',
  'image.tooManyPixels',
  'image.canvasUnavailable',
  'image.encodeFailed',
  'backup.empty',
  'backup.tooLarge',
  'backup.needsPassword',
  'backup.wrongPassword',
  'backup.passwordTooShort',
  'backup.notEncrypted',
  'backup.unreadable',
  'backup.oversized',
  'backup.unexpectedFile',
  'backup.notPistis',
  'backup.unsupportedFormat',
  'backup.invalidSchema',
  'backup.newerVersion',
  'backup.invalidDate',
  'backup.incompleteManifest',
  'backup.damaged',
  'backup.missingFile',
  'backup.alteredFile',
  'backup.unknownTable',
  'backup.countMismatch',
  'backup.missingImage',
  'backup.missingTable',
  'backup.unknownColumns',
  'backup.invalidRow',
  'db.newerSchema',
  'db.storageUnavailable',
  'db.workerFailed',
  'db.otherTab',
  'profile.invalid',
  'goal.invalid',
  'goal.notFound',
  'goal.whyRequired',
  'task.invalid',
  'task.tooManyPinned',
  'milestone.invalid',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorParams = Record<string, string | number>;

export class PistisError extends Error {
  readonly code: ErrorCode;
  readonly params: ErrorParams;

  constructor(code: ErrorCode, params: ErrorParams = {}) {
    super(params.detail ? `${code}: ${params.detail}` : code);
    this.name = 'PistisError';
    this.code = code;
    this.params = params;
  }
}

export function isPistisError(error: unknown, code?: ErrorCode): error is PistisError {
  return error instanceof PistisError && (code === undefined || error.code === code);
}
