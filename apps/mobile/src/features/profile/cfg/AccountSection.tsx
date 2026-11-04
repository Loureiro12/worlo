import { useTranslation } from '@worlo/i18n';
import { Avatar, Button, Sheet, Text, TextArea, TextField, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { changeAvatar } from '@/data/avatar';
import { updateMe, useMe } from '@/data/profile';
import { CfgLayout } from './CfgLayout';
import { accountError, normalizeUser } from './validation';

const BIO_MAX = 140;
// Server limits (profiles.name / username).
const NAME_MAX = 80;
const USER_MAX = 30;

/** K3 · Editar perfil. */
export function AccountSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const me = useMe();
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
          maxLength={NAME_MAX}
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
            maxLength={USER_MAX}
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

/** Sheet "Foto do perfil": camera, gallery or remove. */
function PhotoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { avatar } = useMe();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);

  const pick = async (source: 'camera' | 'library') => {
    setBusy(source);
    try {
      const result = await changeAvatar(source);
      if (result === 'updated') {
        onClose();
        toast.show(t('profile.cfg.photo.updated'));
      } else if (result === 'denied') {
        toast.show(t('profile.photos.cameraDenied'), 'error');
      } else if (result === 'offline') {
        toast.show(t('common.states.offlineTitle'), 'info');
      }
    } catch {
      toast.show(t('profile.photos.pickError'), 'error');
    } finally {
      setBusy(null);
    }
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
          loading={busy === 'camera'}
          disabled={busy !== null}
          onPress={() => void pick('camera')}
        />
        <Button
          testID="photo-gallery"
          variant="outline"
          size="md"
          flex={1}
          icon="image"
          label={t('profile.cfg.photo.gallery')}
          loading={busy === 'library'}
          disabled={busy !== null}
          onPress={() => void pick('library')}
        />
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
