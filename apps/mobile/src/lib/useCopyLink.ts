import { useTranslation } from '@worlo/i18n';
import { useToast } from '@worlo/ui';
import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';

export const WEB_BASE = 'https://worlo.app';
/** App scheme (app.config.ts `scheme`): opens the app on the right screen. */
export const APP_BASE = 'worlo://';

/** Public links (placeholder domain until the web app exists). */
export const links = {
  profile: (user: string) => `${WEB_BASE}/${user}`,
  post: (id: string) => `${WEB_BASE}/p/${id}`,
  /** Invite link to a trip / wish (token from `invite_links`): route `join/[token]`. */
  tripInvite: (token: string) => `${APP_BASE}join/${token}`,
  collection: (id: string) => `${WEB_BASE}/c/${id}`,
};

/** Copies a link to the clipboard and confirms with a toast. */
export function useCopyLink() {
  const { t } = useTranslation();
  const toast = useToast();
  return useCallback(
    async (url: string, message: string = t('common.toasts.linkCopied')) => {
      await Clipboard.setStringAsync(url);
      toast.show(message);
    },
    [t, toast],
  );
}
