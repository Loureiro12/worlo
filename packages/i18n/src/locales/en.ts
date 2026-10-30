import type { TranslationSchema } from '../types';

const en: TranslationSchema = {
  common: {
    appName: 'Worlo',
    add: 'Add',
    cancel: 'Cancel',
    delete: 'Delete',
    retry: 'Try again',
  },
  tasks: {
    title: 'Tasks',
    newPlaceholder: 'What needs to be done?',
    newLabel: 'New task',
    empty: 'No tasks here yet. How about creating the first one?',
    remaining_one: '{{count}} task left',
    remaining_other: '{{count}} tasks left',
    toggle: 'Mark "{{title}}" as done',
    deleteA11y: 'Delete "{{title}}"',
    errors: {
      titleRequired: 'Type a title for the task.',
    },
  },
  sync: {
    offline: 'Offline',
    syncing: 'Syncing…',
    synced: 'Synced',
    error: 'Sync failed',
    pending_one: '{{count}} pending change',
    pending_other: '{{count}} pending changes',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    themes: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    designSystem: 'Design system',
  },
  languages: {
    'pt-BR': 'Português (Brasil)',
    en: 'English',
    es: 'Español',
  },
};

export default en;
