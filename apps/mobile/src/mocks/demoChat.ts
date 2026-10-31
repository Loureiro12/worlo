/**
 * The prototype's chat with Marina (pt-BR on purpose: user content, not UI
 * copy). Seeded as real `messages` rows by `demoWorld()`.
 */
export type DemoChatMessage = { from: 'me' | 'them'; text: string };

export const CHAT_SEEDS: Record<string, DemoChatMessage[]> = {
  'Marina Costa': [
    {
      from: 'them',
      text: 'Ana! Vi que você salvou o veleiro no Tejo. Faz no fim de tarde, é o melhor horário.',
    },
    { from: 'me', text: 'Anotado! Vou em outubro, quer ir junto?' },
    { from: 'them', text: 'Claro! Me chama no roteiro que eu já coloco umas dicas.' },
  ],
};
