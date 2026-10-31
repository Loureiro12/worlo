import { colors } from '../tokens/colors';
import { type IconName, icons } from './icons.generated';

export type { IconName };

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** `fill` marks active states: selected tab, saved, starred, checked. */
  weight?: 'regular' | 'fill';
  testID?: string;
};

/** Phosphor icon. Decorative by default — label the control that wraps it. */
export function Icon({
  name,
  size = 20,
  color = colors.text,
  weight = 'regular',
  testID,
}: IconProps) {
  const Component = icons[name];
  return <Component size={size} color={color} weight={weight} testID={testID} />;
}
