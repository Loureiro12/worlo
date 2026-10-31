import { View, type ViewProps, type ViewStyle } from 'react-native';
import type { Space } from '../tokens/layout';

export type StackProps = ViewProps & {
  direction?: 'row' | 'column';
  /** Only values from the spacing scale (2, 4, 6 … 48). */
  gap?: Space;
  padding?: Space;
  paddingX?: Space;
  paddingY?: Space;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: number;
};

export function Stack({
  direction = 'column',
  gap = 0,
  padding,
  paddingX,
  paddingY,
  align,
  justify,
  wrap,
  flex,
  style,
  ...rest
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap,
          padding,
          paddingHorizontal: paddingX,
          paddingVertical: paddingY,
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
