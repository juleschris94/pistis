import { CreditCard, Landmark, PiggyBank, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react';
import { INSTITUTIONS, type AccountKind, type InstitutionId } from '../../content/institutions';
import { parseLocalDate } from '../../core/localDate';
import { useI18n } from '../../i18n';

export const KIND_ICONS: Record<AccountKind, LucideIcon> = {
  checking: Wallet,
  savings: PiggyBank,
  card: CreditCard,
  meal: UtensilsCrossed,
  other: Landmark,
};

export const KIND_COLORS: Record<AccountKind, string> = {
  checking: 'var(--cat-finance)',
  savings: 'var(--cat-projects)',
  card: 'var(--cat-housing)',
  meal: 'var(--cat-habits)',
  other: 'var(--cat-admin)',
};

export function useInstitutionName() {
  const { t } = useI18n();
  return (id: InstitutionId) => INSTITUTIONS.find((i) => i.id === id)?.name || t('finance.institution.other');
}

/** Montant : les entrées en vert, les sorties dans la couleur du texte (jamais en rouge : une dépense n'est pas une faute). */
export function Money({
  cents,
  currency,
  signed = false,
  strong = false,
}: {
  cents: number;
  currency: string;
  signed?: boolean;
  strong?: boolean;
}) {
  const { formatMoney } = useI18n();
  const className = ['p-money', cents > 0 && signed ? 'p-money--in' : '', strong ? 'p-money--strong' : ''].filter(Boolean).join(' ');
  return <span className={className}>{formatMoney(cents, currency, { signed })}</span>;
}

/** « 2026-10 » ↔ libellé « octobre 2026 », mois précédent / suivant. */
export function useMonthTools() {
  const { formatDate } = useI18n();
  return {
    label: (month: string) => formatDate(parseLocalDate(`${month}-01`), { month: 'long', year: 'numeric' }),
    shift: (month: string, delta: number) => {
      const [y, m] = month.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    current: () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
  };
}

export function useShortDate() {
  const { formatDate } = useI18n();
  return (date: string) => {
    const d = parseLocalDate(date);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return formatDate(d, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  };
}
