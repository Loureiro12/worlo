import type { ChatMessage } from '@/store/slices/community';

/**
 * Mock chat content from the prototype (pt-BR on purpose: it is user content,
 * not UI copy). The support greeting/replies are Worlo's voice → i18n.
 */
export const CHAT_SEEDS: Record<string, ChatMessage[]> = {
  'Marina Costa': [
    {
      id: 'seed-mc-1',
      from: 'them',
      text: 'Ana! Vi que você salvou o veleiro no Tejo. Faz no fim de tarde, é o melhor horário.',
      time: 'ontem 18:40',
    },
    {
      id: 'seed-mc-2',
      from: 'me',
      text: 'Anotado! Vou em outubro, quer ir junto?',
      time: 'ontem 19:02',
    },
    {
      id: 'seed-mc-3',
      from: 'them',
      text: 'Claro! Me chama no roteiro que eu já coloco umas dicas.',
      time: 'ontem 19:05',
    },
  ],
};

export const DEFAULT_CHAT_SEED: ChatMessage[] = [
  { id: 'seed-default', from: 'them', text: 'Oi! Tudo bem?', time: 'ontem' },
];

export const PEOPLE_REPLIES = [
  'Haha, total!',
  'Boa! Me manda o link depois.',
  'Fechado, combinado.',
];

export const SUPPORT_ID = 'support';

/** Automatic reply delay ("digitando…"), from 04_INTERACTIONS. */
export const REPLY_DELAY_MS = 1400;
