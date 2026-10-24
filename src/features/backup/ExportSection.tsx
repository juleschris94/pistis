import { Download, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PistisError } from '../../core/errors';
import type { Database } from '../../data/database';
import { PButton, PField, PMessage } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { backupFileName, exportBackup, readBackup, recordExport } from './backup';
import { MIN_PASSWORD_LENGTH } from './backupCrypto';
import { saveFile } from './saveFile';

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/** Créer une sauvegarde (.pistis), avec mot de passe facultatif, ou tester sans créer de fichier. */
export function ExportSection({ db, appVersion, onDone }: { db: Database; appVersion: string; onDone: () => void }) {
  const { t, tn, formatError, formatBytes } = useI18n();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (e) {
      setStatus({ tone: 'error', text: formatError(e) });
    } finally {
      setBusy(false);
    }
  }

  const onExport = () =>
    run(async () => {
      if (password && password.length < MIN_PASSWORD_LENGTH) throw new PistisError('backup.passwordTooShort', { min: MIN_PASSWORD_LENGTH });
      const encrypted = Boolean(password);
      const { bytes, manifest } = await exportBackup(db, { appVersion, password: password || undefined });
      // Chaque sauvegarde est relue avant d'être proposée : on ne livre jamais un fichier illisible.
      await readBackup(bytes, password || undefined);
      const saved = await saveFile(bytes, backupFileName());
      if (!saved) return setStatus({ tone: 'info', text: t('backup.export.cancelled') });
      await recordExport(db, encrypted);
      setPassword('');
      const total = Object.values(manifest.counts).reduce((s, n) => s + n, 0);
      setStatus({
        tone: 'ok',
        text: `${t(encrypted ? 'backup.export.doneEncrypted' : 'backup.export.done')} ${tn('backup.items', total)} · ${formatBytes(bytes.length)}. ${t('backup.export.copyAway')}`,
      });
      onDone();
    });

  const onSelfTest = () =>
    run(async () => {
      const testPassword = 'verification-locale';
      const { bytes } = await exportBackup(db, { appVersion, password: testPassword });
      await readBackup(bytes, testPassword);
      setStatus({ tone: 'ok', text: t('backup.test.done') });
      onDone();
    });

  return (
    <form
      className="p-stack"
      onSubmit={(e) => {
        e.preventDefault();
        void onExport();
      }}
    >
      {/* Champ caché : aide les gestionnaires de mots de passe à ranger celui de la sauvegarde. */}
      <input type="text" name="username" autoComplete="username" value="PISTIS" readOnly hidden />
      <PField
        id="backup-password"
        type="password"
        label={t('backup.password.label')}
        hint={t('backup.password.hint', { min: MIN_PASSWORD_LENGTH })}
        value={password}
        autoComplete="new-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="p-actions">
        <PButton type="submit" disabled={busy} icon={Download}>
          {t('backup.export.action')}
        </PButton>
        <PButton variant="secondary" onClick={onSelfTest} disabled={busy} icon={ShieldCheck}>
          {t('backup.test.action')}
        </PButton>
      </div>
      {busy && (
        <p className="p-subtle" aria-live="polite">
          {t('common.working')}
        </p>
      )}
      {status && <PMessage tone={status.tone}>{status.text}</PMessage>}
    </form>
  );
}
