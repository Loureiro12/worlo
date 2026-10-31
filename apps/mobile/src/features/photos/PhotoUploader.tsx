import { useEffect } from 'react';
import { uploads } from '@/data/photos';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { useSync } from '@/features/sync/SyncProvider';

/**
 * Mounted once (AppProviders): runs the photo upload queue in the background
 * while signed in and online. Resumes on app start and on reconnect, and sends
 * new picks right away. Renders nothing and never blocks the UI.
 */
export function PhotoUploader() {
  const { online } = useSync();
  const fresh = useQuery(
    () => repos.photos.pendingUploads().filter((f) => f.state === 'pending').length,
    [],
  );

  useEffect(() => {
    uploads.recover();
    return () => uploads.stop();
  }, []);

  // Offline → online (and the first online render) resumes everything pending.
  useEffect(() => {
    uploads.setOnline(online);
  }, [online]);

  useEffect(() => {
    if (online && fresh > 0) void uploads.kick();
  }, [online, fresh]);

  return null;
}
