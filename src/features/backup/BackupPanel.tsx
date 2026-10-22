import { useState } from 'react';
import type { Database } from '../../data/database';
import { PButton, PCard, PField, PMessage } from '../../design-system/components';
import { formatBytes } from '../storage/storageStatus';
import { backupFileName, exportBackup, readBackup, restoreBackup, type ParsedBackup } from './backup';

interface Props {
  db: Database;
  appVersion: string;
  onRestored: () => void;
  onExported: () => void;
}

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/** Export, vérification et restauration d'une archive .pistis. */
export function BackupPanel({ db, appVersion, onRestored, onExported }: Props) {
  const [password, setPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (e) {
      setStatus({ tone: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const onExport = () =>
    run(async () => {
      const { bytes, manifest } = await exportBackup(db, { appVersion, password: password || undefined });
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
      const total = Object.values(manifest.counts).reduce((s, n) => s + n, 0);
      setStatus({
        tone: 'ok',
        text: `Sauvegarde ${password ? 'chiffrée ' : ''}créée : ${total} éléments, ${formatBytes(bytes.length)}. Copie-la hors de cet appareil.`,
      });
      onExported();
    });

  const onSelfTest = () =>
    run(async () => {
      const testPassword = 'verification-locale';
      const { bytes } = await exportBackup(db, { appVersion, password: testPassword });
      const check = await readBackup(bytes, testPassword);
      setStatus({
        tone: 'ok',
        text: `Test réussi : sauvegarde chiffrée relue et validée (${check.manifest.counts.profile} profil, ${check.manifest.counts.media} image). Aucune donnée modifiée.`,
      });
      onExported();
    });

  const onCheckFile = () =>
    run(async () => {
      if (!file) throw new Error('Choisis d’abord un fichier .pistis.');
      const result = await readBackup(new Uint8Array(await file.arrayBuffer()), importPassword || undefined);
      setParsed(result);
      const date = new Date(result.manifest.createdAt).toLocaleString('fr-FR');
      setStatus({
        tone: 'info',
        text: `Sauvegarde valide du ${date} (${result.encrypted ? 'chiffrée' : 'non chiffrée'}) : ${result.manifest.counts.profile} profil, ${result.manifest.counts.media} image(s). La restauration remplacera toutes tes données actuelles.`,
      });
    });

  const onRestore = () =>
    run(async () => {
      if (!parsed) return;
      await restoreBackup(db, parsed);
      setParsed(null);
      setFile(null);
      setImportPassword('');
      setFileInputKey((k) => k + 1);
      setStatus({ tone: 'ok', text: 'Restauration terminée.' });
      onRestored();
    });

  return (
    <PCard title="Sauvegarde et restauration">
      <p className="p-subtle">
        Tes données restent sur cet appareil. Une sauvegarde .pistis te protège en cas de perte et sert à passer d’un appareil à l’autre.
      </p>
      <PField
        id="backup-password"
        type="password"
        label="Mot de passe de la sauvegarde (facultatif)"
        hint="8 caractères minimum. Sans lui, la sauvegarde ne pourra pas être ouverte : note-le."
        value={password}
        autoComplete="new-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="p-actions">
        <PButton onClick={onExport} disabled={busy}>
          Exporter une sauvegarde
        </PButton>
        <PButton variant="secondary" onClick={onSelfTest} disabled={busy}>
          Tester la sauvegarde
        </PButton>
      </div>

      <div className="p-field">
        <label htmlFor="backup-file">Restaurer depuis un fichier</label>
        <input
          key={fileInputKey}
          id="backup-file"
          type="file"
          accept=".pistis,application/octet-stream"
          className="p-input"
          style={{ paddingTop: 10 }}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setParsed(null);
          }}
        />
      </div>
      <PField
        id="import-password"
        type="password"
        label="Mot de passe (si la sauvegarde est chiffrée)"
        value={importPassword}
        autoComplete="current-password"
        onChange={(e) => setImportPassword(e.target.value)}
      />
      <div className="p-actions">
        <PButton variant="secondary" onClick={onCheckFile} disabled={busy || !file}>
          Vérifier le fichier
        </PButton>
        {parsed && (
          <PButton variant="danger" onClick={onRestore} disabled={busy}>
            Remplacer mes données
          </PButton>
        )}
      </div>
      {status && <PMessage tone={status.tone}>{status.text}</PMessage>}
    </PCard>
  );
}
