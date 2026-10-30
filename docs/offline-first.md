# Offline first

**O SQLite do dispositivo é a fonte da verdade da UI.** A rede só serve para sincronizar.

```
UI ──lê──▶ useLiveQuery(SQLite)            (re-renderiza a cada escrita local)
UI ──escreve──▶ repositório ──transação──▶ tabela + _outbox
                                              │
SyncEngine ── push _outbox ─────────────────▶ Supabase (upsert, RLS)
           ◀─ pull (updated_at, id) > cursor ─┘
```

## Peças

| Onde                                             | O quê                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `packages/db/src/schema.ts`                      | Tabelas locais + `_outbox` + `_sync_cursors`                                           |
| `packages/db/src/tasks.ts`                       | Repositório: toda escrita grava o registro **e** o outbox na mesma transação           |
| `packages/sync/src/engine.ts`                    | Push do outbox, depois pull paginado por cursor. Chamadas concorrentes são coalescidas |
| `packages/sync/src/scheduler.ts`                 | Debounce de escritas, retry com backoff exponencial, pausa offline                     |
| `packages/db/src/local-store.ts`                 | Adapter SQLite do engine. Não sobrescreve registros com mutações pendentes             |
| `packages/sync/src/adapters/supabase.ts`         | Adapter remoto (PostgREST)                                                             |
| `apps/mobile/src/features/sync/SyncProvider.tsx` | Liga tudo: NetInfo, AppState, sessão, sync periódico (60s)                             |

## Convenções de tabela sincronizada

Toda tabela sincronizada tem, nos dois lados:

- `id uuid`, gerado **no dispositivo** (permite criar offline);
- `updated_at`, carimbado **pelo servidor** via trigger (`clock_timestamp()`), usado como cursor;
- `deleted_at`, para soft delete (deleções precisam chegar aos outros dispositivos);
- `user_id default auth.uid()` + RLS, só no Postgres.

### Adicionando uma tabela

1. `packages/db/src/schema.ts`: adicione a tabela e rode `pnpm db:generate`.
2. `supabase/migrations`: crie a tabela com trigger e RLS (copie `…_tasks.sql`) e um teste pgTAP.
3. `packages/db/src/synced-tables.ts`: registre os mappers e inclua a tabela em `syncOrder` (pais antes de filhos).
4. Crie um repositório como `tasks.ts`. Nunca escreva na tabela sem passar pelo outbox.
5. `pnpm db:types`.

## Autenticação

Quando há rede e nenhuma sessão, o app cria uma **sessão anônima** (`signInAnonymously`), então os dados sincronizam sem tela de cadastro. Para converter em conta real, use `supabase.auth.updateUser({ email })` ou `linkIdentity`. O `user_id` é preservado.

## Decisões e limites conhecidos

- **Conflitos: last-write-wins por registro.** A última versão enviada ao servidor vence. Enquanto houver mutação local pendente, o pull não sobrescreve aquele registro. Se precisar de merge por campo, envie só os campos alterados no payload do outbox.
- **Cursor por `updated_at`.** Uma transação longa no servidor pode commitar com timestamp anterior ao cursor de outro cliente e não ser vista. Com escritas curtas (upserts do próprio app) o risco é baixo. Se virar problema, troque por um cursor de sequência lógica (por exemplo, `xid`) ou adote [PowerSync](https://www.powersync.com/), que usa as mesmas convenções de tabela.
- **Mutações com erro permanente** (por exemplo, violação de constraint) ficam no outbox com `attempts`/`last_error` e bloqueiam a fila. Valide no repositório (como `TaskValidationError`) para que dados inválidos nunca entrem no outbox.
- **Logout**: apague o banco local (`deleteDatabaseSync`) para não misturar dados de contas diferentes.
