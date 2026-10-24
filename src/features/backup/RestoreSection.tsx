import { FileUp, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { APP_VERSION } from '../../app/services';
import { isPistisError } from '../../core/errors';
import type { Database } from '../../data/database';
import { PButton, PField, PFileButton, PMessage } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { readBackup, restoreWithUndo, undoRestore, type ParsedBackup } from './backup';

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/**
 * Restaurer une sauvegarde : choix du fichier → vérification complète → confirmation → remplacement.
 * La restauration peut être annulée juste après (sauf à l'accueil, où il n'y a encore rien à protéger).
 */
export function RestoreSection({ db, onRestored, standalone }: { db: Database; onRestored: () => void; standalone?: boolean }) {
  const { t, tn, formatError, formatDate } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [undo, setUndo] = useState<Uint8Array | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (e) {
      if (isPistisError(e, 'backup.needsPassword')) setNeedsPassword(true);
      setStatus({ tone: 'error', text: formatError(e) });
    } finally {
      setBusy(false);
    }
  }

  const check = (target: File, pass: string) =>
    run(async () => {
      const result = await readBackup(new Uint8Array(await target.arrayBuffer()), pass || undefined);
      setParsed(result);
      setNeedsPassword(result.encrypted);
      setStatus({
        tone: 'info',
        text: t('backup.restore.valid', {
          date: formatDate(new Date(result.manifest.createdAt), { dateStyle: 'long', timeStyle: 'short' }),
          images: tn('backup.images', result.manifest.counts.media ?? 0),
        }),
      });
    });

  const restore = () =>
    run(async () => {
      if (!parsed) return;
      const safety = await restoreWithUndo(db, parsed, APP_VERSION);
      setUndo(standalone ? null : safety);
      setParsed(null);
      setFile(null);
      setPassword('');
      setNeedsPassword(false);
      setStatus({ tone: 'ok', text: t('backup.restore.done') });
      onRestored();
    });

  const cancelRestore = () =>
    run(async () => {
      if (!undo) return;
      await undoRestore(db, undo);
      setUndo(null);
      setStatus({ tone: 'ok', text: t('backup.restore.undone') });
      onRestored();
    });

  return (
    <div className="p-stack">
      <div className="p-row">
        <PFileButton
          id="backup-file"
          icon={FileUp}
          variant={standalone ? 'primary' : 'secondary'}
          label={file ? t('backup.restore.chooseOther') : t('backup.restore.choose')}
          accept=".pistis,application/octet-stream"
          onFile={(f) => {
            setFile(f);
            setParsed(null);
            setNeedsPassword(false);
            setUndo(null);
            void check(f, password);
          }}
        />
        {file && <span className="p-subtle p-filename">{file.name}</span>}
      </div>
      {file && needsPassword && !parsed && (
        <form
          className="p-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) void check(file, password);
          }}
        >
          <input type="text" name="username" autoComplete="username" value="PISTIS" readOnly hidden />
          <PField
            id="import-password"
            type="password"
            label={t('backup.restore.password')}
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="p-actions">
            <PButton type="submit" variant="secondary" disabled={busy || !password}>
              {t('backup.restore.unlock')}
            </PButton>
          </div>
        </form>
      )}
      {busy && (
        <p className="p-subtle" aria-live="polite">
          {t('common.working')}
        </p>
      )}
      {status && <PMessage tone={status.tone}>{status.text}</PMessage>}
      {parsed && (
        <div className="p-actions">
          <PButton variant="danger" onClick={restore} disabled={busy}>
            {standalone ? t('backup.restore.confirmNew') : t('backup.restore.confirm')}
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
            {t('common.cancel')}
          </PButton>
        </div>
      )}
      {undo && (
        <div className="p-actions">
          <PButton variant="secondary" icon={Undo2} onClick={cancelRestore} disabled={busy}>
            {t('backup.restore.undo')}
          </PButton>
        </div>
      )}
    </div>
  );
}
