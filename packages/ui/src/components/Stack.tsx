import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { SpaceToken } from '../tokens/semantic';

export type StackProps = ViewProps & {
  direction?: 'row' | 'column';
  gap?: SpaceToken;
  padding?: SpaceToken;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: number;
};

/** Layout primitive. Spacing only accepts tokens, never raw numbers. */
export function Stack({
  direction = 'column',
  gap = 'none',
  padding,
  align,
  justify,
  wrap,
  flex,
  style,
  ...rest
}: StackProps) {
  const { space } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: space[gap],
          padding: padding ? space[padding] : undefined,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : undefined,
          flex,
        },
        style,
      ]}
      {...rest}
    />
  );
}

export const VStack = (props: Omit<StackProps, 'direction'>) => <Stack {...props} />;
export const HStack = (props: Omit<StackProps, 'direction'>) => (
  <Stack align="center" {...props} direction="row" />
);
