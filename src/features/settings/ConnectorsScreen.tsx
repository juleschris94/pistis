import { CalendarDays, HeartPulse, Landmark, Map, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../../app/paths';
import { INSTITUTIONS } from '../../content/institutions';
import { PBadge, PCard, PList, PListRow, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';

/**
 * Connecteurs : ce qui fonctionne aujourd'hui, ce qui arrive et pourquoi. Aucune promesse floue,
 * et jamais d'identifiants bancaires demandés dans PISTIS.
 */
export function ConnectorsScreen() {
  const { t } = useI18n();
  const banks = INSTITUTIONS.filter((i) => i.name)
    .map((i) => i.name)
    .join(', ');
  const available = <PBadge tone="positive">{t('connectors.available')}</PBadge>;
  const soon = <PBadge>{t('connectors.inPreparation')}</PBadge>;

  return (
    <>
      <PTopBar title={t('connectors.title')} subtitle={t('connectors.subtitle')} back={ROUTES.settings} backLabel={t('common.back')} />

      <PCard variant="vision">
        <div className="p-row">
          <ShieldCheck aria-hidden="true" />
          <p className="p-grow">{t('connectors.promise')}</p>
        </div>
      </PCard>

      <section className="p-stack p-stack--tight" aria-labelledby="c-banks">
        <h2 className="p-subheading" id="c-banks">
          {t('connectors.banks')}
        </h2>
        <PList>
          <PListRow
            icon={Landmark}
            color="var(--cat-finance)"
            title={t('connectors.banks.import')}
            subtitle={banks}
            to={ROUTES.financeImport}
            trailing={available}
          />
          <PListRow
            icon={Landmark}
            color="var(--cat-finance)"
            title={t('connectors.banks.live')}
            subtitle={t('connectors.banks.live.body')}
            trailing={soon}
          />
        </PList>
      </section>

      <section className="p-stack p-stack--tight" aria-labelledby="c-agenda">
        <h2 className="p-subheading" id="c-agenda">
          {t('connectors.agenda')}
        </h2>
        <PList>
          <PListRow
            icon={CalendarDays}
            color="var(--cat-projects)"
            title={t('connectors.agenda.import')}
            subtitle={t('connectors.agenda.import.body')}
            to={ROUTES.planning}
            trailing={available}
          />
          <PListRow
            icon={CalendarDays}
            color="var(--cat-projects)"
            title={t('connectors.agenda.sync')}
            subtitle={t('connectors.agenda.sync.body')}
            trailing={soon}
          />
        </PList>
      </section>

      <section className="p-stack p-stack--tight" aria-labelledby="c-maps">
        <h2 className="p-subheading" id="c-maps">
          {t('connectors.maps')}
        </h2>
        <PList>
          <PListRow
            icon={Map}
            color="var(--cat-housing)"
            title={t('connectors.maps.directions')}
            subtitle={t('connectors.maps.directions.body')}
            to={ROUTES.planning}
            trailing={available}
          />
        </PList>
      </section>

      <section className="p-stack p-stack--tight" aria-labelledby="c-health">
        <h2 className="p-subheading" id="c-health">
          {t('connectors.health')}
        </h2>
        <PList>
          <PListRow
            icon={HeartPulse}
            color="var(--cat-habits)"
            title={t('connectors.health.native')}
            subtitle={t('connectors.health.native.body')}
            trailing={<PBadge>{t('connectors.androidApp')}</PBadge>}
          />
        </PList>
      </section>
    </>
  );
}
