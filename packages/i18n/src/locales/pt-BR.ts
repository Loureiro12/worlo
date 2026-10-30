/**
 * Source of truth for translation keys. Other locales are typed against this
 * file, so a missing or extra key fails `typecheck`.
 *
 * Plurals follow i18next's `_one` / `_other` suffixes (Intl.PluralRules).
 */
const ptBR = {
  common: {
    appName: 'Worlo',
    add: 'Adicionar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    retry: 'Tentar novamente',
  },
  tasks: {
    title: 'Tarefas',
    newPlaceholder: 'O que precisa ser feito?',
    newLabel: 'Nova tarefa',
    empty: 'Nenhuma tarefa por aqui. Que tal criar a primeira?',
    remaining_one: '{{count}} tarefa pendente',
    remaining_other: '{{count}} tarefas pendentes',
    toggle: 'Marcar "{{title}}" como concluída',
    deleteA11y: 'Excluir "{{title}}"',
    errors: {
      titleRequired: 'Digite um título para a tarefa.',
    },
  },
  sync: {
    offline: 'Offline',
    syncing: 'Sincronizando…',
    synced: 'Sincronizado',
    error: 'Erro ao sincronizar',
    pending_one: '{{count}} alteração pendente',
    pending_other: '{{count}} alterações pendentes',
  },
  settings: {
    title: 'Configurações',
    language: 'Idioma',
    theme: 'Tema',
    themes: {
      system: 'Sistema',
      light: 'Claro',
      dark: 'Escuro',
    },
    designSystem: 'Design system',
  },
  languages: {
    'pt-BR': 'Português (Brasil)',
    en: 'English',
    es: 'Español',
  },
};

export default ptBR;
