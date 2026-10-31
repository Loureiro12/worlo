import { alpha, colors, radius, Text } from '@worlo/ui';
import { Pressable, View } from 'react-native';

/**
 * Small segmented control on carvão (share → formato): padding 3, segment 32,
 * label 12/700. `Segmented` from @worlo/ui is 36–40 with 14pt labels, which
 * truncates "Story 9:16" next to the theme swatches.
 * Promotion candidate: `Segmented size="sm"`.
 */
export function CompactSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
  testID,
}: {
  options: readonly { value: T; label: string; testID?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        padding: 3,
        gap: 3,
        borderRadius: radius.full,
        backgroundColor: alpha.darkChip,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
              backgroundColor: active ? colors.surface : 'transparent',
            }}
          >
            <Text
              variant="caption"
              weight={700}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{
                fontSize: 12,
                lineHeight: 16,
                color: active ? colors.text : colors.textInverseMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
