import { PistisError } from '../../core/errors';

/** Page publiée sur claude.ai : l'hôte propose l'enregistrement (capacité « downloads »). */
interface HostWindow {
  claude?: {
    use: (name: 'downloads') => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null>;
  };
}

/**
 * Version web hébergée : le fichier passe par la fenêtre de confirmation de l'hôte.
 * Les extensions acceptées par l'hôte sont limitées : la sauvegarde (un ZIP) devient « .pistis.zip »,
 * que la restauration accepte aussi.
 */
async function saveThroughHost(bytes: Uint8Array, name: string): Promise<boolean> {
  const downloads = await (window as unknown as HostWindow).claude!.use('downloads');
  if (!downloads) throw new PistisError('backup.saveUnavailable');
  try {
    await downloads.save({ filename: `${name}.zip`, data: new Blob([bytes as BlobPart], { type: 'application/zip' }) });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'declined') return false;
    throw new PistisError('backup.saveUnavailable', { detail: (error as { code?: string }).code ?? '' });
  }
}

/**
 * Enregistre un fichier pour l'utilisateur.
 * - Sur ordinateur (Chrome, Edge) : fenêtre « Enregistrer sous », pour choisir un dossier
 *   (idéalement hors de l'appareil : clé USB, dossier synchronisé).
 * - Ailleurs : téléchargement classique dans le dossier Téléchargements.
 * - Version web hébergée (page claude.ai) : fenêtre de confirmation de l'hôte.
 *
 * Renvoie `false` si l'utilisateur a annulé : ce n'est pas une erreur.
 */
interface SaveFilePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<{ write: (data: BlobPart) => Promise<void>; close: () => Promise<void> }> }>;
}

export async function saveFile(bytes: Uint8Array, name: string): Promise<boolean> {
  if (typeof (window as unknown as HostWindow).claude?.use === 'function') return saveThroughHost(bytes, name);
  const picker = (window as unknown as SaveFilePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: name,
        types: [{ description: 'Sauvegarde PISTIS', accept: { 'application/octet-stream': ['.pistis'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(bytes as BlobPart);
      await writable.close();
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return false;
      // Fenêtre refusée par le navigateur (ex. contexte restreint) : on se rabat sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
