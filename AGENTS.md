# Worlo — guia para agentes e contribuidores

Monorepo pnpm + Turborepo. App Expo (SDK 58) em `apps/mobile`, pacotes em `packages/*`, Supabase em `supabase/`. Node 22 (`.nvmrc`).

App-specific Expo guidance: `apps/mobile/AGENTS.md`.

## Comandos

```sh
pnpm install
pnpm check                 # lint + typecheck + testes (rode antes de concluir qualquer tarefa)
pnpm test:affected         # só o que mudou
pnpm db:start | db:test | db:types | db:generate
```

Para adicionar dependência nativa ao app: `cd apps/mobile && npx expo install <pkg>`. Versões compartilhadas ficam no `catalog:` do `pnpm-workspace.yaml`.

## Regras do projeto

- **Offline first**: a UI lê do SQLite (`useLiveQuery`) e escreve via repositórios de `@worlo/db`. Nunca chame o Supabase direto da UI para dados de domínio, e nunca escreva numa tabela sincronizada sem passar pelo outbox. Ver `docs/offline-first.md`.
- **Design system**: telas usam componentes de `@worlo/ui`. Sem cores, espaçamentos ou tamanhos de fonte crus. Use tokens via `makeStyles`/`useTheme`. Ver `docs/design-system.md`.
- **i18n**: nenhum texto visível hardcoded. Adicione chaves em `packages/i18n/src/locales/pt-BR.ts` (fonte da verdade) e o typecheck aponta os outros idiomas. Ver `docs/i18n.md`.
- **Banco**: toda tabela nova tem RLS e teste pgTAP em `supabase/tests`. Depois de migrations, rode `pnpm db:types`.
- **Testes**: prefira a camada mais baixa (Vitest em pacotes puros > Jest de componente > Maestro). E2E só para fluxos críticos, selecionando por `testID`. Ver `docs/testing.md`.
- **Pacotes `sync` e `i18n` não importam React Native.** Mantenha-os testáveis em Node.
- Lint e format: Biome (`pnpm format`). Não adicione ESLint/Prettier.
