import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Button,
  colors,
  Photo,
  radius,
  Sheet,
  Text,
  TextArea,
  TextField,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { img } from '@/lib/images';
import { useStore } from '@/store';
import { CfgLayout } from './CfgLayout';
import { accountError, normalizeUser } from './validation';

const BIO_MAX = 140;

/** K3 · Editar perfil. */
export function AccountSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const me = useStore((s) => s.me);
  const updateMe = useStore((s) => s.updateMe);
  const [form, setForm] = useState({ name: me.name, user: me.user, city: me.city, bio: me.bio });
  const [error, setError] = useState<'name' | 'user' | null>(null);
  const [photoSheet, setPhotoSheet] = useState(false);

  const change = (field: keyof typeof form) => (text: string) => {
    setForm((f) => ({ ...f, [field]: field === 'user' ? normalizeUser(text) : text }));
    setError(null);
  };

  const save = () => {
    const invalid = accountError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    updateMe({ name: form.name.trim(), user: form.user, city: form.city.trim(), bio: form.bio });
    toast.show(t('profile.cfg.account.saved'));
    router.back();
  };

  return (
    <CfgLayout
      section="account"
      cta={{ label: t('profile.cfg.account.cta'), onPress: save }}
      error={error ? t(`profile.cfg.account.errors.${error}`) : null}
    >
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar name={form.name || me.name} isMe photoUrl={me.avatar} size={88} />
          <Button
            testID="account-change-photo"
            variant="pill"
            size="sm"
            icon="camera"
            label={t('profile.cfg.account.changePhoto')}
            onPress={() => setPhotoSheet(true)}
          />
        </View>
        <TextField
          testID="account-name"
          label={t('profile.cfg.account.name')}
          placeholder={t('profile.cfg.account.namePlaceholder')}
          value={form.name}
          onChangeText={change('name')}
          invalid={error === 'name'}
          autoComplete="name"
          textContentType="name"
        />
        <View style={{ gap: 6 }}>
          <TextField
            testID="account-user"
            label={t('profile.cfg.account.user')}
            placeholder={t('profile.cfg.account.userPlaceholder')}
            icon="at"
            value={form.user}
            onChangeText={change('user')}
            invalid={error === 'user'}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <Text variant="caption" tone="muted" style={{ fontSize: 12 }} testID="account-preview">
            {t('profile.cfg.account.preview', { user: form.user })}
          </Text>
        </View>
        <TextField
          testID="account-city"
          label={t('profile.cfg.account.city')}
          placeholder={t('profile.cfg.account.cityPlaceholder')}
          value={form.city}
          onChangeText={change('city')}
        />
        <TextArea
          testID="account-bio"
          label={t('profile.cfg.account.bio')}
          placeholder={t('profile.cfg.account.bioPlaceholder')}
          maxLength={BIO_MAX}
          minHeight={88}
          value={form.bio}
          onChangeText={change('bio')}
        />
      </View>
      <PhotoSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} />
    </CfgLayout>
  );
}

/** Sheet "Foto do perfil": camera, gallery, trip photos or remove (simulated). */
function PhotoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const avatar = useStore((s) => s.me.avatar);
  const trips = useStore((s) => s.trips);
  const updateMe = useStore((s) => s.updateMe);
  const choices = trips.slice(0, 6).map((trip, i) => img(`${trip.id}-p${i}`, 200, 200));

  const pick = (uri: string) => {
    updateMe({ avatar: uri });
    onClose();
    toast.show(t('profile.cfg.photo.updated'));
  };

  return (
    <Sheet
      testID="photo-sheet"
      visible={visible}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      title={t('profile.cfg.photo.title')}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          testID="photo-camera"
          variant="outline"
          size="md"
          flex={1}
          icon="camera"
          label={t('profile.cfg.photo.camera')}
          onPress={() => pick(img(`selfie-${Date.now() % 7}`, 300, 300))}
        />
        <Button
          testID="photo-gallery"
          variant="outline"
          size="md"
          flex={1}
          icon="image"
          label={t('profile.cfg.photo.gallery')}
          onPress={() => pick(img(`gal-${Date.now() % 9}`, 300, 300))}
        />
      </View>
      <Text variant="overline" tone="muted">
        {t('profile.cfg.photo.fromTrips')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {choices.map((uri, i) => (
          <Pressable
            key={uri}
            testID={`photo-choice-${i}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: avatar === uri }}
            accessibilityLabel={t('profile.cfg.photo.pick', { n: i + 1 })}
            onPress={() => pick(uri)}
            style={{
              width: '31.5%',
              aspectRatio: 1,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: avatar === uri ? colors.primary : 'transparent',
              overflow: 'hidden',
            }}
          >
            <Photo uri={uri} tint={colors.border} height="100%" radius={0} />
          </Pressable>
        ))}
      </View>
      {avatar ? (
        <Button
          testID="photo-remove"
          variant="destructive"
          size="md"
          label={t('profile.cfg.photo.remove')}
          onPress={() => {
            updateMe({ avatar: null });
            onClose();
            toast.show(t('profile.cfg.photo.removed'), 'info');
          }}
        />
      ) : null}
    </Sheet>
  );
}
