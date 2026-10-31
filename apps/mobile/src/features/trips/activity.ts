import type { Activity } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { useMemo } from 'react';
import { useTimeAgo } from '@/data/notifications';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';

/** A row of "Atividade recente" (C1): who did what, when. */
export type ActivityView = {
  id: string;
  kind: Activity['kind'];
  userId: string;
  who: string;
  avatarUrl: string | null;
  text: string;
  when: string;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Activity on a trip (synced), newest first, with the i18n template per kind. */
export function useTripActivity(tripId: string | undefined): ActivityView[] {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const rows = useQuery(() => {
    if (!tripId) return [];
    const list = repos.activities.forEntity('trip', tripId);
    const people = new Map(repos.people.byIds(list.map((a) => a.userId)).map((p) => [p.id, p]));
    return list.map((a) => ({ row: a, person: people.get(a.userId) }));
  }, [tripId]);

  return useMemo(
    () =>
      rows.map(({ row, person }) => {
        const count = num(row.data.count) ?? 1;
        const day = num(row.data.day);
        const text =
          row.kind === 'photos'
            ? day
              ? t('trips.activity.photosDay', { count, day })
              : t('trips.activity.photos', { count })
            : row.kind === 'expense'
              ? t('trips.activity.expense', {
                  amount: str(row.data.amount),
                  name: str(row.data.name),
                })
              : row.kind === 'diary'
                ? day
                  ? t('trips.activity.diaryDay', { day })
                  : t('trips.activity.diary')
                : t('trips.activity.joined');
        return {
          id: row.id,
          kind: row.kind,
          userId: row.userId,
          who: person?.name ?? '',
          avatarUrl: person?.avatarUrl ?? null,
          text,
          when: timeAgo(row.createdAt),
        };
      }),
    [rows, t, timeAgo],
  );
}
