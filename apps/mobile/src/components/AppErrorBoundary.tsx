import { useTranslation } from '@worlo/i18n';
import { FullScreenState } from '@worlo/ui';
import { router } from 'expo-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { recordError } from '@/lib/errorLog';
import { routes } from '@/navigation/routes';

type State = { error: Error | null };

/**
 * A screen that throws while rendering shows "Algo deu errado" instead of
 * closing the app. Data is safe either way (every change is already in
 * SQLite), but closing loses the screen and looks like data loss.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const where = info.componentStack?.trim().split('\n')[0]?.trim() ?? '';
    recordError(
      Object.assign(new Error(error.message), {
        stack: `${error.stack ?? ''}\n--- component stack ---${info.componentStack ?? ''}`,
      }),
      `render${where ? `:${where}` : ''}`,
      true,
    );
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <CrashScreen
        onRetry={this.reset}
        onHome={() => {
          this.reset();
          router.replace(routes.splash);
        }}
      />
    );
  }
}

function CrashScreen({ onRetry, onHome }: { onRetry: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  return (
    <FullScreenState
      kind="error"
      title={t('common.crash.title')}
      text={t('common.crash.text')}
      retryLabel={t('common.actions.retry')}
      onRetry={onRetry}
      secondary={{ label: t('common.crash.home'), onPress: onHome }}
    />
  );
}
