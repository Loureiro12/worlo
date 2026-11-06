import { useTranslation } from '@worlo/i18n';
import { alpha, Card, colors, Icon, Text } from '@worlo/ui';
import { View } from 'react-native';
import { useTripSplit } from '@/data/trips';
import { firstName } from '@/lib/people';
import type { Collaborator } from '@/mocks/types';
import { formatAmount } from './money';

/**
 * "Divisão" (7.4): what each person paid against their share, and the fewest
 * transfers that settle it. On the trip's Gastos tab while traveling, and on
 * the retrospective after it ends.
 */
export function SplitSummary({
  tripId,
  collab,
  currency,
  onDark = false,
}: {
  tripId: string;
  collab: readonly Collaborator[];
  currency: string;
  onDark?: boolean;
}) {
  const { t } = useTranslation();
  const { parties, balance, transfers } = useTripSplit(tripId, collab, t('trips.split.you'));
  if (parties.length < 2) return null;
  const nameOf = (key: string) => firstName(parties.find((p) => p.key === key)?.name ?? '');
  const fmt = (value: number) => formatAmount(Math.abs(value), currency);
  const tone = onDark ? 'inverse' : 'default';
  const muted = onDark ? 'inverseMuted' : 'muted';
  return (
    <Card
      testID="trip-split"
      radius={24}
      padding={20}
      gap={12}
      surface={onDark ? 'dark' : undefined}
      style={onDark ? { borderWidth: 1, borderColor: alpha.darkBorder } : undefined}
    >
      <Text variant="h3" tone={tone} accessibilityRole="header">
        {t('trips.split.title')}
      </Text>
      {parties.map((p) => {
        const value = balance.get(p.key) ?? 0;
        const text =
          value > 0.004
            ? t('trips.split.receives', { value: fmt(value) })
            : value < -0.004
              ? t('trips.split.owes', { value: fmt(value) })
              : t('trips.split.even');
        return (
          <View
            key={p.key}
            testID={`split-balance-${firstName(p.name)}`}
            accessible
            accessibilityLabel={`${firstName(p.name)}, ${text}`}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
          >
            <Text variant="label" tone={tone}>
              {firstName(p.name)}
            </Text>
            <Text
              variant="label"
              weight={700}
              tone={value > 0.004 ? 'success' : value < -0.004 ? tone : muted}
            >
              {text}
            </Text>
          </View>
        );
      })}
      <View style={{ height: 1, backgroundColor: onDark ? alpha.darkBorder : colors.background }} />
      {transfers.length === 0 ? (
        <Text variant="bodyS" tone={muted}>
          {t('trips.split.settled')}
        </Text>
      ) : (
        transfers.map((x) => (
          <View
            key={`${x.from}-${x.to}`}
            testID={`split-transfer-${nameOf(x.from)}-${nameOf(x.to)}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Icon
              name="arrow-right"
              size={16}
              color={onDark ? colors.textInverseMuted : colors.textMuted}
            />
            <Text variant="bodyS" tone={tone} style={{ flex: 1 }}>
              {t('trips.split.transfer', { from: nameOf(x.from), to: nameOf(x.to) })}
            </Text>
            <Text variant="label" weight={700} tone={tone}>
              {fmt(x.amount)}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}
