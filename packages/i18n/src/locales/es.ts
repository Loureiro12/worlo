import type { TranslationSchema } from '../types';

const es: TranslationSchema = {
  common: {
    appName: 'Worlo',
    add: 'Agregar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    retry: 'Reintentar',
  },
  tasks: {
    title: 'Tareas',
    newPlaceholder: '¿Qué hay que hacer?',
    newLabel: 'Nueva tarea',
    empty: 'Aún no hay tareas. ¿Qué tal crear la primera?',
    remaining_one: '{{count}} tarea pendiente',
    remaining_other: '{{count}} tareas pendientes',
    toggle: 'Marcar "{{title}}" como completada',
    deleteA11y: 'Eliminar "{{title}}"',
    errors: {
      titleRequired: 'Escribe un título para la tarea.',
    },
  },
  sync: {
    offline: 'Sin conexión',
    syncing: 'Sincronizando…',
    synced: 'Sincronizado',
    error: 'Error al sincronizar',
    pending_one: '{{count}} cambio pendiente',
    pending_other: '{{count}} cambios pendientes',
  },
  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    theme: 'Tema',
    themes: {
      system: 'Sistema',
      light: 'Claro',
      dark: 'Oscuro',
    },
    designSystem: 'Design system',
  },
  languages: {
    'pt-BR': 'Português (Brasil)',
    en: 'English',
    es: 'Español',
  },
};

export default es;
