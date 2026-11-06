import { useTranslation } from '@worlo/i18n';
import { colors, Icon, radius, Text, TextField } from '@worlo/ui';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { type Place, searchPlaces } from '@/lib/places';

/**
 * Destination with search (2.1): cities and countries from the offline list,
 * as you type. Nothing forces a pick (2.2): "Usar “…”" keeps exactly what was
 * typed, for places no list has (a relative's house, a small village).
 */
export function DestinationField({
  testID,
  label,
  placeholder,
  value,
  invalid,
  onChangeText,
  onPick,
}: {
  testID: string;
  label: string;
  placeholder?: string;
  value: string;
  invalid?: boolean;
  onChangeText: (text: string) => void;
  /** A list place, or null when the text is the person's own. */
  onPick: (place: Place | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  // A short pause while typing: the list has 34k cities.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value), 120);
    return () => clearTimeout(timer);
  }, [value]);
  const results = useMemo(
    () => (open ? searchPlaces(query, i18n.language, 6) : []),
    [open, query, i18n.language],
  );
  const typed = value.trim();

  const choose = (place: Place | null) => {
    if (place) onChangeText(place.label);
    onPick(place);
    setOpen(false);
  };

  return (
    <View style={{ gap: 6 }}>
      <TextField
        testID={testID}
        label={label}
        icon="magnifying-glass"
        placeholder={placeholder}
        value={value}
        invalid={invalid}
        autoCorrect={false}
        onChangeText={(text) => {
          onChangeText(text);
          onPick(null);
          setOpen(true);
        }}
        // Leaving the field closes the list (it would push the next fields
        // down under the finger); a short delay lets a tap on an option land.
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        returnKeyType="next"
      />
      {open && typed.length >= 2 ? (
        <View
          testID={`${testID}-results`}
          accessibilityLabel={t('common.destination.results')}
          style={{
            borderRadius: radius.r16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            overflow: 'hidden',
          }}
        >
          {results.map((place, i) => (
            <Pressable
              key={`${place.kind}-${place.label}-${i}`}
              testID={`${testID}-option-${i}`}
              accessibilityRole="button"
              accessibilityLabel={place.label}
              onPress={() => choose(place)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: pressed ? colors.background : undefined,
                borderBottomWidth: 1,
                borderBottomColor: colors.background,
              })}
            >
              <Text style={{ fontSize: 20 }} accessibilityElementsHidden>
                {place.flag}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" weight={700} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {place.kind === 'country' ? t('common.destination.country') : place.countryName}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            testID={`${testID}-custom`}
            accessibilityRole="button"
            onPress={() => choose(null)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: pressed ? colors.background : undefined,
            })}
          >
            <Icon name="map-pin" size={20} color={colors.textMuted} />
            <Text variant="body" tone="support" style={{ flex: 1 }} numberOfLines={2}>
              {t('common.destination.useTyped', { text: typed })}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
