# Worlo

App React Native (Expo) **offline first**, internacionalizado e sincronizado com **Supabase**, em um monorepo pnpm + Turborepo.

## Estrutura

```
apps/
  mobile/              App Expo (Expo Router). Telas finas que compõem pacotes.
    src/app/           Rotas (cada arquivo é uma tela)
    src/features/      Features (tasks, sync, settings)
    src/providers/     Composição: preferências, migrations, sync, repositórios
    .maestro/          Testes E2E (Maestro)
    scripts/e2e.mjs    Build de E2E com cache nativo por fingerprint
packages/
  ui/                  Design system: tokens → tema → componentes
  i18n/                i18next tipado (pt-BR, en, es)
  db/                  Schema SQLite local (Drizzle), repositórios, adapter do sync
  sync/                Sync engine (TS puro): outbox, push/pull, scheduler
  supabase/            Cliente tipado + tipos gerados do Postgres
supabase/              Migrations, RLS, testes pgTAP, config local
docs/                  Decisões de arquitetura
```

Dependências entre pacotes: `mobile → ui, i18n, db, sync, supabase`; `db → sync`. Os pacotes `sync` e `i18n` não dependem de React Native, então rodam e são testados em Node puro.

## Primeiros passos

Pré-requisitos: Node 22 (`nvm use`), pnpm 10, Docker (para o Supabase local), Xcode e/ou Android Studio, [Maestro](https://maestro.dev) para E2E.

```sh
pnpm install
pnpm db:start                             # Supabase local (portas 563xx)
cp apps/mobile/.env.example apps/mobile/.env.local   # cole a PUBLISHABLE_KEY exibida
pnpm --filter @worlo/mobile ios           # ou android (development build)
```

Sem `.env.local` o app roda 100% local, sem sincronizar. Útil para trabalhar na UI.

## Scripts

| Comando                                     | O que faz                                                     |
| ------------------------------------------- | ------------------------------------------------------------- |
| `pnpm lint` / `pnpm format`                 | Biome (lint + format + imports)                               |
| `pnpm typecheck`                            | `tsc` em todos os workspaces (Turbo, com cache)               |
| `pnpm test`                                 | Testes unitários e de componentes (Turbo, com cache)          |
| `pnpm test:affected`                        | Só o que mudou em relação à `main`                            |
| `pnpm db:start` / `db:stop` / `db:reset`    | Supabase local                                                |
| `pnpm db:test`                              | Testes pgTAP (RLS, triggers)                                  |
| `pnpm db:types`                             | Regenera `packages/supabase/src/database.types.ts`            |
| `pnpm db:generate`                          | Gera migration SQLite após editar `packages/db/src/schema.ts` |
| `pnpm --filter @worlo/mobile e2e:build ios` | Build Release para E2E (reaproveita o binário nativo)         |
| `pnpm e2e:smoke` / `pnpm e2e`               | Maestro: smoke ou suíte completa                              |

## Documentação

- [Offline first e sync](docs/offline-first.md)
- [Design system](docs/design-system.md)
- [Internacionalização](docs/i18n.md)
- [Estratégia de testes](docs/testing.md)
