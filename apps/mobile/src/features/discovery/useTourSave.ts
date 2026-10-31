import { useTranslation } from '@worlo/i18n';
import { useToast } from '@worlo/ui';
import { toggleSaved, useIsSaved } from '@/data/saved';
import type { Tour } from '@/mocks/types';
import { savedIdOf, tourSavedItem } from './tours';

/** Heart on a tour: toggles it in Lugares salvos + toast (03_FLOWS → F7/F8). */
export function useTourSave(tour: Tour) {
  const { t } = useTranslation();
  const toast = useToast();
  const saved = useIsSaved(savedIdOf(tour.id));
  const toggle = () => {
    toggleSaved(tourSavedItem(tour));
    if (saved) toast.show(t('discovery.toasts.removed'), 'info');
    else toast.show(t('discovery.toasts.saved'));
  };
  return { saved, toggle };
}
