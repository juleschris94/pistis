/**
 * Enregistre un fichier pour l'utilisateur.
 * - Sur ordinateur (Chrome, Edge) : fenêtre « Enregistrer sous », pour choisir un dossier
 *   (idéalement hors de l'appareil : clé USB, dossier synchronisé).
 * - Ailleurs : téléchargement classique dans le dossier Téléchargements.
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
