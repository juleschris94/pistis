import { ArrowRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { CATEGORY_IDS, type CategoryId } from '../../content/categories';
import type { Database } from '../../data/database';
import { PButton, PIconButton, PSteps, PTile } from '../../design-system/components';
import { LogoMark } from '../../design-system/Logo';
import { useI18n } from '../../i18n';
import { RestoreSection } from '../backup/RestoreSection';
import { ProfileForm } from '../profile/ProfileForm';
import { settingsStatements, type Settings } from '../settings/settings';
import { HeroArt } from './HeroArt';

type Step = 'welcome' | 'needs' | 'profile' | 'restore';

/**
 * Premier lancement : bienvenue → besoins → profil. Aucun compte en ligne.
 * « Déjà un espace ? » permet de restaurer une sauvegarde sur un nouvel appareil.
 */
export function Onboarding({ db, initialSettings, onDone }: { db: Database; initialSettings: Settings; onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('welcome');
  const [categories, setCategories] = useState<CategoryId[]>(initialSettings.categories);

  if (step === 'welcome') {
    return (
      <main className="p-hero">
        <HeroArt />
        <div className="p-hero__content">
          <LogoMark size={84} className="p-hero__mark" />
          <h1 className="p-hero__name">PISTIS</h1>
          <p className="p-hero__tagline">
            {t('brand.signature.1')}
            <br />
            {t('brand.signature.2')}
            <br />
            {t('brand.signature.3')}
          </p>
          <p className="p-hero__note">{t('welcome.local')}</p>
          <PButton variant="light" block iconAfter={ArrowRight} onClick={() => setStep('needs')}>
            {t('welcome.start')}
          </PButton>
          <PButton variant="ghost" onClick={() => setStep('restore')}>
            {t('welcome.restore')}
          </PButton>
        </div>
      </main>
    );
  }

  const back = (to: Step) => <PIconButton icon={ChevronLeft} label={t('common.back')} onClick={() => setStep(to)} plain />;

  if (step === 'restore') {
    return (
      <main className="p-page">
        <div className="p-topbar">
          {back('welcome')}
          <div className="p-topbar__title">
            <h1 className="p-title">{t('welcome.restore.title')}</h1>
          </div>
        </div>
        <p className="p-subtle">{t('welcome.restore.body')}</p>
        <RestoreSection db={db} onRestored={onDone} standalone />
      </main>
    );
  }

  if (step === 'needs') {
    const toggle = (id: CategoryId) =>
      setCategories((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));
    return (
      <main className="p-page">
        <div className="p-topbar">
          {back('welcome')}
          <div className="p-topbar__title">
            <PSteps current={1} total={2} label={t('onboarding.progress', { current: 1, total: 2 })} />
          </div>
        </div>
        <div className="p-stack p-stack--tight">
          <h1 className="p-title">{t('onboarding.needs.title')}</h1>
          <p className="p-subtle">{t('onboarding.needs.body')}</p>
        </div>
        <div className="p-tiles" role="group" aria-label={t('onboarding.needs.title')}>
          {CATEGORY_IDS.map((id) => (
            <PTile
              key={id}
              icon={CATEGORY_VISUALS[id].icon}
              color={CATEGORY_VISUALS[id].color}
              label={t(`category.${id}`)}
              selected={categories.includes(id)}
              onToggle={() => toggle(id)}
            />
          ))}
        </div>
        <p className="p-caption">{t('onboarding.needs.hint')}</p>
        <PButton block iconAfter={ArrowRight} disabled={categories.length === 0} onClick={() => setStep('profile')}>
          {t('common.next')}
        </PButton>
      </main>
    );
  }

  return (
    <main className="p-page">
      <div className="p-topbar">
        {back('needs')}
        <div className="p-topbar__title">
          <PSteps current={2} total={2} label={t('onboarding.progress', { current: 2, total: 2 })} />
        </div>
      </div>
      <div className="p-stack p-stack--tight">
        <h1 className="p-title">{t('onboarding.profile.title')}</h1>
        <p className="p-subtle">{t('onboarding.profile.body')}</p>
      </div>
      <ProfileForm
        db={db}
        profile={null}
        currentAvatar={null}
        submitLabel={t('onboarding.profile.submit')}
        extraStatements={settingsStatements({ categories, language: initialSettings.language, theme: initialSettings.theme })}
        onSaved={onDone}
      />
    </main>
  );
}
