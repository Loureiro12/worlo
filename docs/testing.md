# Estratégia de testes

Objetivo: **confiança de ponta a ponta sem que os testes virem gargalo.** A maior parte da lógica vive em pacotes TS puros, que se testam em milissegundos. O E2E fica reservado aos fluxos críticos e roda de forma escalonada.

| Camada                            | Ferramenta              | Onde                             | Tempo    | Quando roda                  |
| --------------------------------- | ----------------------- | -------------------------------- | -------- | ---------------------------- |
| Lógica de sync, scheduler, i18n   | Vitest                  | `packages/sync`, `packages/i18n` | < 1s     | Todo PR (só os afetados)     |
| SQLite real + engine              | Vitest + better-sqlite3 | `packages/db`                    | < 1s     | Todo PR (só os afetados)     |
| Componentes e contraste WCAG      | Jest + RNTL             | `packages/ui`, `apps/mobile`     | ~3s      | Todo PR (só os afetados)     |
| Repositórios ⇄ Supabase real      | Vitest                  | `packages/db`, `packages/sync`   | ~2s      | PRs que mexem no banco/sync  |
| Banco: RLS, triggers, constraints | pgTAP                   | `supabase/tests`                 | ~5s      | PRs que mexem no banco       |
| E2E `smoke` (Explorar + Viagens)  | Maestro                 | `apps/mobile/.maestro`           | ~2–3 min | PRs que mexem no app/pacotes |
| E2E completo (8 áreas, `full`)    | Maestro                 | idem                             | ~12 min  | `main` e nightly             |

## Por que não vira gargalo

- **Pirâmide de verdade.** O sync engine e o adapter SQLite são testados com fakes e SQLite em memória (incluindo dois "dispositivos" sincronizando via o mesmo servidor), não via E2E.
- **Turborepo `--affected` + cache.** Um PR que só mexe em `packages/i18n` não roda os testes do `ui`, e o que já passou não roda de novo.
- **Hooks baratos.** O pre-commit (lefthook) roda só o Biome nos arquivos staged. Testes ficam no CI ou em `pnpm test:affected`.
- **E2E sem rebuild nativo.** `scripts/e2e.mjs` guarda o binário Release pelo [fingerprint](https://docs.expo.dev/versions/latest/sdk/fingerprint/) nativo. Mudou só JS? O bundle é reempacotado no binário existente (`@expo/repack-app`) em segundos. O build completo só acontece quando muda dependência nativa, plugin ou config. Vale localmente e no CI (cache do Actions).
- **Maestro em vez de Detox.** É caixa-preta, sem instrumentação nativa nem build de teste separado, e com espera automática, o que reduz flakiness.
- **Tags** separam o que roda em PR (`smoke`) do que roda em `main`/nightly (`sync`, `ui`).
- **Concurrency** cancela execuções antigas do mesmo branch.

## Rodando E2E localmente

Todo fluxo faz login de verdade com a conta demo (`ana@worlo.app`) num Supabase local com as seeds. O build lê `apps/mobile/.env.local` (copie de `.env.example`).

```sh
pnpm db:start                                   # migrations + seeds (catálogo + conta demo)
pnpm db:reset                                   # antes de cada rodada completa: os fluxos mudam os dados da conta demo
pnpm --filter @worlo/mobile e2e:build ios       # simulador aberto; 1ª vez build completo, depois só repack de JS
pnpm --filter @worlo/mobile e2e:install ios
pnpm e2e:smoke                                  # ou pnpm e2e (os 8 fluxos)
```

Tempos de referência (iPhone 16 Pro, iOS 18): build nativo completo ~9 min; build seguinte só com JS (repack) ~15 s; suíte completa ~13 min.

### Escrevendo fluxos que funcionam no iOS

Aprendido rodando a suíte no simulador. Cada item já causou uma falha real:

- **Login compartilhado.** Todo fluxo começa com `runFlow: ../subflows/login.yaml` (conta demo, login real), que tem os testIDs combinados com `features/auth`. O cadastro usa `inputRandomEmail` para não repetir conta.
- **Testes de componente usam SQLite de verdade.** Cada teste Jest começa com um banco em memória (better-sqlite3 + as migrations reais) com a conta demo e o catálogo (`src/test/seed.ts`). Verifique o que foi gravado por `repos.*`, não por estado em memória.
- **Sem `back`.** O comando só existe no Android. Use `tapOn: { id: header-back }`; todo header do design system tem esse testID.
- **Campos de senha.** O XCUITest não digita em `secureTextEntry`. Revele antes (`<testID>-reveal`, o botão do olho) e depois digite.
- **Teclado.** O `hideKeyboard` é instável no iOS e falha em teclados numéricos e campos multilinha. Feche o teclado tocando num texto não interativo, como o título da tela (as telas usam `keyboardShouldPersistTaps="handled"`). Nunca toque num campo coberto pelo teclado: o toque cai numa tecla.
- **Elementos agrupados.** Cards e botões `accessible` viram um único elemento cujo rótulo junta os filhos ("Confirmar, 129"). Para checar um texto interno, use regex no rótulo: `text: '.*Reservado.*'`.
- **Fora da tela.** Itens adicionados no fim de listas exigem `scrollUntilVisible`. Em listas dentro de sheets, faça um `swipe` explícito dentro da sheet.
- **Telas com animação contínua** (globo girando, pulso do onboarding). O XCUITest espera o app ficar ocioso antes e depois de cada toque, e a espera esgota o prazo. Nessas telas, verifique o efeito (a tela não avançou, o item foi salvo) e não o toast de 2,4s, que já é coberto por teste de componente.

### Diferenças entre iOS e Android

- **Estado de checkbox.** O Android expõe `checked`; o iOS expõe o estado no valor de acessibilidade. Use `subflows/assert-checked.yaml`.
- **Modo avião** (`setAirplaneMode`) só existe no Android.

## Convenções

- Selecione elementos por `testID` (estável entre idiomas), não por texto, exceto quando o texto é o que se quer testar (como no flow de i18n).
- Componentes: teste comportamento e acessibilidade (`getByRole('button', { name })`), não snapshots.
- Bug encontrado no E2E vira primeiro um teste na camada mais baixa possível.
