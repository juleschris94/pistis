import { useEffect, useState } from 'react';
import type { Database } from '../../data/database';
import { PButton, PCard, PField, PFileButton, PMessage } from '../../design-system/components';
import { formatBytes } from '../storage/storageStatus';
import {
  BACKUP_REMINDER_DAYS,
  backupFileName,
  backupFreshness,
  exportBackup,
  lastExportAt,
  readBackup,
  recordExport,
  restoreWithUndo,
  undoRestore,
  type ParsedBackup,
} from './backup';
import { saveFile } from './saveFile';

interface Props {
  db: Database;
  appVersion: string;
  /** Appelé après toute modification des données (restauration, annulation). */
  onDataReplaced: () => void;
  /** Appelé quand une sauvegarde a été produite et vérifiée. */
  onBackupVerified: () => void;
}

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/** Export, vérification et restauration d'une archive .pistis. */
export function BackupPanel({ db, appVersion, onDataReplaced, onBackupVerified }: Props) {
  const [password, setPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [undo, setUndo] = useState<Uint8Array | null>(null);
  // Date de la dernière sauvegarde, et moment où elle a été lue (pour calculer son âge).
  const [last, setLast] = useState<{ at: number | null; checkedAt: number } | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const refreshLast = async () => {
    const at = await lastExportAt(db);
    setLast({ at, checkedAt: Date.now() });
  };
  useEffect(() => {
    let alive = true;
    lastExportAt(db).then((at) => alive && setLast({ at, checkedAt: Date.now() }));
    return () => {
      alive = false;
    };
  }, [db]);

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
      if (password && password.length < 8) throw new Error('Le mot de passe de sauvegarde fait au moins 8 caractères.');
      const { bytes, manifest } = await exportBackup(db, { appVersion, password: password || undefined });
      // Chaque sauvegarde est relue avant d'être proposée : on ne livre jamais un fichier illisible.
      await readBackup(bytes, password || undefined);
      const saved = await saveFile(bytes, backupFileName());
      if (!saved) return setStatus({ tone: 'info', text: 'Enregistrement annulé.' });
      await recordExport(db, Boolean(password));
      await refreshLast();
      onBackupVerified();
      const total = Object.values(manifest.counts).reduce((s, n) => s + n, 0);
      setPassword('');
      setStatus({
        tone: 'ok',
        text: `Sauvegarde ${password ? 'chiffrée ' : ''}enregistrée et vérifiée : ${total} éléments, ${formatBytes(bytes.length)}. Garde-en une copie hors de cet appareil.`,
      });
    });

  const onSelfTest = () =>
    run(async () => {
      const testPassword = 'verification-locale';
      const { bytes } = await exportBackup(db, { appVersion, password: testPassword });
      const check = await readBackup(bytes, testPassword);
      onBackupVerified();
      setStatus({
        tone: 'ok',
        text: `Test réussi : sauvegarde chiffrée produite puis relue (${check.manifest.counts.profile} profil, ${check.manifest.counts.media} image). Aucun fichier créé, aucune donnée modifiée.`,
      });
    });

  async function check(target: File, pass: string) {
    await run(async () => {
      try {
        const result = await readBackup(new Uint8Array(await target.arrayBuffer()), pass || undefined);
        setParsed(result);
        setNeedsPassword(result.encrypted);
        const date = new Date(result.manifest.createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
        setStatus({
          tone: 'info',
          text: `Sauvegarde valide du ${date} : ${result.manifest.counts.profile} profil, ${result.manifest.counts.media} image(s). La restauration remplacera tes données actuelles ; tu pourras l’annuler juste après.`,
        });
      } catch (e) {
        if ((e as Error).message.includes('chiffrée')) setNeedsPassword(true);
        throw e;
      }
    });
  }

  const onRestore = () =>
    run(async () => {
      if (!parsed) return;
      const safety = await restoreWithUndo(db, parsed, appVersion);
      setUndo(safety);
      setParsed(null);
      setFile(null);
      setImportPassword('');
      setNeedsPassword(false);
      await refreshLast();
      onDataReplaced();
      setStatus({ tone: 'ok', text: 'Restauration terminée.' });
    });

  const onUndo = () =>
    run(async () => {
      if (!undo) return;
      await undoRestore(db, undo);
      setUndo(null);
      await refreshLast();
      onDataReplaced();
      setStatus({ tone: 'ok', text: 'Restauration annulée : tes données précédentes sont revenues.' });
    });

  const freshness = last ? backupFreshness(last.at, last.checkedAt) : null;

  return (
    <PCard title="Sauvegarde et restauration" id="sauvegarde">
      <p className="p-subtle">
        Tes données restent sur cet appareil. Une sauvegarde .pistis te protège en cas de perte et sert à passer d’un appareil à l’autre.
      </p>
      {freshness && (
        <PMessage tone={freshness.kind === 'recent' ? 'ok' : 'attention'}>
          {freshness.kind === 'never'
            ? 'Aucune sauvegarde pour l’instant. Une première sauvegarde prend dix secondes.'
            : `Dernière sauvegarde ${freshness.days === 0 ? 'aujourd’hui' : freshness.days === 1 ? 'hier' : `il y a ${freshness.days} jours`}.` +
              (freshness.kind === 'due' ? ` Au-delà de ${BACKUP_REMINDER_DAYS} jours, une nouvelle sauvegarde est conseillée.` : '')}
        </PMessage>
      )}

      <h3 className="p-subheading">Créer une sauvegarde</h3>
      <form
        className="p-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void onExport();
        }}
      >
        {/* Champ caché : aide les gestionnaires de mots de passe à ranger celui de la sauvegarde. */}
        <input type="text" name="username" autoComplete="username" value="Sauvegarde PISTIS" readOnly hidden />
        <PField
          id="backup-password"
          type="password"
          label="Mot de passe de la sauvegarde (facultatif)"
          hint="8 caractères minimum. Il chiffre le fichier ; sans lui, personne ne peut l’ouvrir, pas même PISTIS. Note-le."
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="p-actions">
          <PButton type="submit" disabled={busy}>
            Exporter une sauvegarde
          </PButton>
          <PButton variant="secondary" onClick={onSelfTest} disabled={busy}>
            Tester la sauvegarde
          </PButton>
        </div>
      </form>

      <h3 className="p-subheading">Restaurer</h3>
      <div className="p-row">
        <PFileButton
          id="backup-file"
          label={file ? 'Choisir un autre fichier' : 'Choisir un fichier .pistis'}
          accept=".pistis,application/octet-stream"
          onFile={(f) => {
            setFile(f);
            setParsed(null);
            setNeedsPassword(false);
            void check(f, importPassword);
          }}
        />
        {file && <span className="p-subtle p-filename">{file.name}</span>}
      </div>
      {file && needsPassword && !parsed && (
        <form
          className="p-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (importPassword) void check(file, importPassword);
          }}
        >
          <input type="text" name="username" autoComplete="username" value="Sauvegarde PISTIS" readOnly hidden />
          <PField
            id="import-password"
            type="password"
            label="Mot de passe de cette sauvegarde"
            value={importPassword}
            autoComplete="current-password"
            onChange={(e) => setImportPassword(e.target.value)}
          />
          <div className="p-actions">
            <PButton type="submit" variant="secondary" disabled={busy || !importPassword}>
              Déverrouiller
            </PButton>
          </div>
        </form>
      )}
      {parsed && (
        <div className="p-actions">
          <PButton variant="danger" onClick={onRestore} disabled={busy}>
            Remplacer mes données
          </PButton>
          <PButton
            variant="ghost"
            onClick={() => {
              setParsed(null);
              setFile(null);
              setStatus(null);
            }}
            disabled={busy}
          >
            Annuler
          </PButton>
        </div>
      )}
      {busy && (
        <p className="p-subtle" aria-live="polite">
          Traitement en cours…
        </p>
      )}
      {status && <PMessage tone={status.tone}>{status.text}</PMessage>}
      {undo && (
        <div className="p-actions">
          <PButton variant="secondary" onClick={onUndo} disabled={busy}>
            Annuler la restauration
          </PButton>
        </div>
      )}
    </PCard>
  );
}
