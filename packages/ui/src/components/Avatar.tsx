import { Image } from 'expo-image';
import { View } from 'react-native';
import { avatarColors, currentUserAvatarColor } from '../tokens/colors';
import { fontFamily } from '../tokens/typography';
import { Text } from './Text';

export type AvatarProps = {
  name: string;
  /** Explicit initials; defaults to the first letters of the first two words. */
  initials?: string;
  size?: number;
  /** Index in the color cycle (stable per person). */
  colorIndex?: number;
  /** Logged-in user: coral background. */
  isMe?: boolean;
  photoUrl?: string | null;
  /** Ring color for stacked avatars (= the background behind them). */
  ringColor?: string;
  /** Overrides the color cycle (e.g. carvão expert avatars). */
  colors?: { background: string; foreground: string };
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  initials,
  size = 44,
  colorIndex = 0,
  isMe = false,
  photoUrl,
  ringColor,
  colors: override,
}: AvatarProps) {
  const palette =
    override ??
    (isMe
      ? currentUserAvatarColor
      : (avatarColors[colorIndex % avatarColors.length] ?? avatarColors[0]));
  const ring = ringColor ? 2 : 0;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.background,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: ring,
        borderColor: ringColor,
      }}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Text
          style={{
            fontFamily: fontFamily.ui700,
            fontSize: Math.max(9, Math.round(size / 2.8)),
            lineHeight: Math.max(11, Math.round(size / 2.8) + 2),
            color: palette.foreground,
          }}
        >
          {initials ?? initialsOf(name)}
        </Text>
      )}
    </View>
  );
}

export type AvatarStackProps = {
  people: readonly Omit<AvatarProps, 'size' | 'ringColor'>[];
  size?: number;
  ringColor: string;
  max?: number;
  /** Accessible summary, e.g. "Marina e João". */
  label: string;
};

export function AvatarStack({ people, size = 30, ringColor, max = 4, label }: AvatarStackProps) {
  const overlap = size >= 36 ? -8 : -6;
  return (
    <View accessible accessibilityLabel={label} style={{ flexDirection: 'row' }}>
      {people.slice(0, max).map((person, index) => (
        <View key={`${person.name}-${index}`} style={{ marginLeft: index === 0 ? 0 : overlap }}>
          <Avatar {...person} size={size} ringColor={ringColor} />
        </View>
      ))}
    </View>
  );
}
