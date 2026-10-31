import { View, type ViewProps } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, palette } from '../tokens/colors';
import { radius } from '../tokens/layout';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Coral count bubble (bell, tabs). */
export function CountBadge({ count }: { count: number }) {
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant="micro"
        weight={800}
        style={{ color: colors.onPrimary, fontSize: 10, lineHeight: 12 }}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export function UnreadDot() {
  return (
    <View
      accessibilityElementsHidden
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }}
    />
  );
}

export type MapStatus = 'visited' | 'planned' | 'wishlist';

/**
 * Map identity markers (README → Marcadores do mapa):
 * visited = coral circle + check, planned = carvão square + "+", wishlist = diamond.
 */
export function StatusMarker({
  status,
  size = 14,
  onDark = true,
}: {
  status: MapStatus;
  size?: number;
  onDark?: boolean;
}) {
  const stroke = onDark ? palette.branco : palette.carvao;
  if (status === 'visited') {
    return (
      <Svg width={size} height={size} viewBox="0 0 14 14" accessibilityElementsHidden>
        <Rect
          x={0.75}
          y={0.75}
          width={12.5}
          height={12.5}
          rx={6.25}
          fill={palette.coral}
          stroke={palette.branco}
          strokeWidth={1.5}
        />
        <Path d="M4 7 L6.2 9.4 L10.2 4.6" stroke={palette.carvao} strokeWidth={1.8} fill="none" />
      </Svg>
    );
  }
  if (status === 'planned') {
    return (
      <Svg width={size} height={size} viewBox="0 0 14 14" accessibilityElementsHidden>
        <Rect
          x={1}
          y={1}
          width={12}
          height={12}
          fill={palette.carvao}
          stroke={stroke}
          strokeWidth={1.5}
        />
        <Path d="M4 7 H10 M7 4 V10" stroke={palette.branco} strokeWidth={1.5} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" accessibilityElementsHidden>
      <Path
        d="M7 0.5 L13.5 7 L7 13.5 L0.5 7 Z"
        fill={palette.carvao}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

export type StatusChipKind = MapStatus | 'verified' | 'neutral' | 'dark' | 'coral';

const chipStyles: Record<StatusChipKind, { bg: string; fg: string; border?: string }> = {
  visited: { bg: palette.coral100, fg: palette.coral700 },
  planned: { bg: palette.carvao, fg: palette.branco },
  wishlist: { bg: 'transparent', fg: palette.carvao, border: palette.carvao },
  verified: { bg: palette.areia, fg: palette.sucesso },
  neutral: { bg: palette.areia, fg: palette.cinza800 },
  dark: { bg: palette.carvao, fg: palette.branco },
  coral: { bg: palette.coral, fg: palette.carvao },
};

const chipIcons: Partial<Record<StatusChipKind, IconName>> = {
  visited: 'check',
  verified: 'seal-check',
};

export type StatusChipProps = ViewProps & {
  kind: StatusChipKind;
  label: string;
  icon?: IconName;
  size?: 'sm' | 'md';
};

/** Status pill: Visitado / Em planejamento / Quero ir / Verificado / custom. */
export function StatusChip({ kind, label, icon, size = 'md', style, ...rest }: StatusChipProps) {
  const s = chipStyles[kind];
  const iconName = icon ?? chipIcons[kind];
  const marker = kind === 'planned' || kind === 'wishlist';
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        {
          height: size === 'sm' ? 26 : 30,
          paddingHorizontal: 12,
          borderRadius: radius.full,
          backgroundColor: s.bg,
          borderWidth: s.border ? 1 : 0,
          borderColor: s.border,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
        },
        style,
      ]}
      {...rest}
    >
      {marker ? (
        <StatusMarker status={kind} size={11} onDark={kind === 'planned'} />
      ) : iconName ? (
        <Icon
          name={iconName}
          size={14}
          color={s.fg}
          weight={kind === 'verified' ? 'fill' : 'regular'}
        />
      ) : null}
      <Text
        variant="caption"
        weight={700}
        style={{ color: s.fg, fontSize: size === 'sm' ? 12 : 13 }}
      >
        {label}
      </Text>
    </View>
  );
}
