# Worlo

App React Native (Expo) **offline first**, internacionalizado e sincronizado com **Supabase**, em um monorepo pnpm + Turborepo.

## Estrutura

```
apps/
  mobile/                      App Expo (Expo Router)
    src/app/                   Rotas (arquivos finos que reexportam telas)
      (tabs)/(explore,map,trips,community,profile)/   5 abas + telas de detalhe compartilhadas
    src/features/<área>/       Telas e componentes por área: auth, explore, map, trips,
                               planning, community, profile, discovery (+ dev/design-system)
    src/components/            Peças do app usadas por várias áreas (tab bar, sheets, DemoGate)
    src/navigation/routes.ts   Todas as rotas; telas nunca montam caminhos à mão
    src/store/                 Estado de UI (zustand), um slice por área
    src/mocks/                 Dados mock do protótipo (gerados) + tipos
    .maestro/                  Testes E2E (Maestro)
packages/
  ui/                          Design system Worlo: tokens → componentes, globo 3D
  i18n/                        i18next tipado, um módulo por área (pt-BR, en, es)
  db/, sync/, supabase/        Camada offline-first (ainda não ligada às telas)
supabase/                      Migrations, RLS, testes pgTAP
design_handoff_worlo_app/      Handoff de design (referência, não editar)
docs/                          Decisões de arquitetura
```

Fase atual: **visual**. As telas usam dados mock e estado local. A integração com `db`/`sync`/Supabase é a próxima etapa.

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
