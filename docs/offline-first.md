# Offline first

**O SQLite do dispositivo é a fonte da verdade da UI.** A rede só serve para sincronizar.

```
UI ──lê──▶ useQuery(() => repos.x.y())     (re-renderiza a cada escrita local ou pull)
UI ──escreve──▶ repos (repositório) ──transação──▶ tabela + _outbox
                                                     │
SyncEngine ── push _outbox ────────────────────────▶ Supabase (upsert, RLS)
           ◀─ pull (updated_at, id) > cursor ───────┘
```

## Peças

| Onde                                             | O quê                                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `packages/db/src/schema.ts`                      | Tabelas locais (espelho do Postgres) + `_outbox` + `_sync_cursors`                              |
| `packages/db/src/repositories.ts`                | Repositórios por área (`profile`, `world`, `trips`, `planning`, `saved`, `catalog`)             |
| `packages/db/src/writer.ts`                      | Toda escrita grava o registro **e** o outbox na mesma transação; valida antes                   |
| `packages/db/src/synced-tables.ts`               | Registro das tabelas sincronizadas e mapeamento local ⇄ remoto (só muda a caixa das chaves)     |
| `packages/db/src/local-store.ts`                 | Adapter SQLite do engine. Não sobrescreve registros com mutações pendentes. `wipeLocalData`     |
| `packages/sync/src/engine.ts`                    | Push do outbox, depois pull paginado por cursor. Chamadas concorrentes são coalescidas          |
| `packages/sync/src/scheduler.ts`                 | Debounce de escritas, retry com backoff exponencial, pausa offline                              |
| `packages/sync/src/adapters/supabase.ts`         | Adapter remoto (PostgREST)                                                                      |
| `apps/mobile/src/data/`                          | `repos` (singleton), `useQuery`, `useCatalog`, e os hooks de cada área (linhas → tipos de tela) |
| `apps/mobile/src/features/sync/SyncProvider.tsx` | Liga tudo: NetInfo, AppState, sessão, sync periódico (60s), `ready`                             |
| `apps/mobile/src/lib/auth.ts`                    | Ações de conta (Supabase Auth): e-mail, Apple, Google, senha, exclusão                          |

## Dados

| Tipo                   | Tabelas                                                                                                                                                                           | Sincronização                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Pessoais**           | `profiles` (perfil + preferências), `visited_countries`, `wish_destinations`, `trips`, `trip_expenses`, `itineraries`, `live_sessions`, `live_logs`, `saved_items`, `collections` | push + pull, RLS por usuário                                            |
| **Catálogo**           | `catalog` (países, cidades, lugares, passeios, roteiros recomendados…), uma linha por entidade: `id = '<kind>:<key>'`                                                             | só pull                                                                 |
| **Compartilhados**     | `trips`/`wish_destinations` com `memberships` (dono + colaboradores), `trip_expenses`, `photos` (arquivo no Storage), `activities`                                                | push + pull, RLS por relação: dono, convidado (prévia) ou membro aceito |
| **Pessoas e avisos**   | `people` (perfil público de quem se relaciona com você + especialistas), `follows`, `notifications` (criadas por triggers), `chat_threads`/`chat_members`/`messages`, `devices`   | push + pull (pull only: `people`, `activities`, `chat_threads`)         |
| **Passeios (fase 3)**  | `tour_slots` (datas e vagas), `bookings` (minhas reservas), `businesses` (cadastros do Anuncie)                                                                                   | pull only: `tour_slots`, `bookings`; push + pull: `businesses`          |
| **Online (com cache)** | feed da comunidade, posts, comentários, votos, página de viajante, busca de pessoas — RPCs `community_feed`, `post_comments`, `traveler_profile`, `search_people`                 | React Query (`QueryProvider`); offline mostra o estado offline          |

O catálogo é montado no app por `buildCatalog` (`apps/mobile/src/data/catalogSpec.ts`) nas mesmas estruturas que as telas já usavam. Editar conteúdo = editar linhas de `catalog` no Supabase; os aparelhos recebem no próximo sync, sem nova versão do app.

Regra para escolher: se o dado é **seu ou de quem viaja com você** e precisa funcionar sem rede, ele sincroniza. Se é **conteúdo de qualquer pessoa** (feed, perfis de estranhos), ele é online: sincronizar tudo para todo celular não escala, e o design já tem o estado "precisa de conexão".

## Convenções de tabela sincronizada

Toda tabela sincronizada tem, nos dois lados:

- `id uuid`, gerado **no dispositivo** (permite criar offline);
- `created_at`, `updated_at` (carimbado **pelo servidor** via trigger com `clock_timestamp()`, usado como cursor);
- `deleted_at`, para soft delete (deleções precisam chegar aos outros dispositivos);
- só no Postgres: `user_id default auth.uid()` + RLS (`profiles` usa o próprio `id`). Filhos (`trip_expenses`, `live_sessions`, `live_logs`) têm política restritiva: o pai precisa ser do mesmo usuário.

Os nomes de coluna locais são os mesmos do Postgres (as chaves TS ficam em camelCase), então o mapeamento é automático.

### Adicionando uma tabela

1. `supabase/migrations`: crie a tabela com as colunas acima e inclua-a no bloco que cria índice, trigger e RLS. Adicione asserts em `supabase/tests/database/core.test.sql`. `pnpm db:test`.
2. `packages/db/src/schema.ts`: mesma tabela, mesmos nomes de coluna. `pnpm db:generate`.
3. `packages/db/src/synced-tables.ts`: `createMapper(tabela)` e inclua em `syncOrder` (pais antes de filhos).
4. Métodos no repositório (com validação espelhando os `check` do Postgres) e testes em `repositories.test.ts`. Nunca escreva na tabela sem passar pelo writer (outbox).
5. `pnpm db:types`. Rode `src/supabase.integration.test.ts` contra o Supabase local (ver [testes](testing.md)).

## Autenticação

Login obrigatório: e-mail e senha, Apple (iOS) e Google (quando `EXPO_PUBLIC_GOOGLE_*` estiver configurado). O perfil é criado pelo servidor no cadastro (`handle_new_user`) e desce no primeiro sync. O app só sai da splash quando perfil e catálogo estão no SQLite (`useSync().ready`).

- **Troca de conta**: se outra conta entra no mesmo aparelho, o banco local é apagado antes (`onSessionUser`). Sair da conta também apaga.
- **Excluir conta**: RPC `delete_my_account()`, que apaga o usuário e, em cascata, todos os dados dele.
- **Conta demo**: `ana@worlo.app` / `worlo1234`, gerada dos dados do protótipo (`apps/mobile/src/mocks/demo.ts` → `supabase/seeds/demo.sql`). Serve para testadores, App Review, E2E e testes de componente.

## Compartilhamento (fase 2)

- **Dono e membros.** O dono é o `user_id` da viagem/desejo. Convidar cria uma `membership` `pending` (o convidado vê a prévia, sem gastos); aceitar vira `accepted` (vê e edita tudo, só o dono exclui). Sair/remover vira `removed`. As transições são validadas no servidor (`guard_membership`).
- **Visibilidade muda sem a linha mudar.** Quando alguém é convidado, a viagem (e os gastos, fotos, atividade) passam a ser visíveis para ele, mas o `updated_at` deles é antigo e o cursor do pull não os veria. Por isso toda relação nova "toca" (`touch_entity`, `touch_people`) as linhas que ela revela.
- **Perdeu o acesso?** A própria `membership` (`removed`/`declined`) continua visível para a pessoa; depois de cada sync o app roda `repos.collab.prune()`, que apaga do aparelho a viagem e o que dependia dela (inclusive escritas pendentes, que o servidor recusaria).
- **Upsert e RLS.** O engine envia `upsert`, e o Postgres checa a política de INSERT contra a linha proposta mesmo quando acaba atualizando. Tabelas editadas por mais de uma pessoa aceitam esse INSERT quando a linha já existe e a pessoa pode editá-la (`can_edit`, `expense_editable`, `membership_updatable`); quem decide de fato são as políticas de UPDATE.
- **Notificações e atividade** são escritas só por triggers (convite, aceite, gasto/fotos de membro, seguir, comentário, confirmações). O aparelho só marca `read_at`: um trigger ignora qualquer outra mudança vinda do app.
- **Tempo real.** Com sessão e rede, o app escuta `messages`, `notifications`, `memberships` e `chat_members` (Supabase Realtime, com RLS) e sincroniza na hora.
- **2FA.** Com um fator TOTP verificado, toda tabela exige sessão AAL2 (`aal_ok()`, política restritiva). Antes do código, o banco não devolve nada.

## Passeios e Anuncie (fase 3)

- **Sem pagamento online.** A reserva guarda vagas numa data; o viajante paga direto ao anfitrião no dia (o app avisa isso na folha "Sua reserva"). Ligar um intermediador depois é só mudar `book_tour` para criar a reserva `pending` e confirmar via webhook.
- **Reservar e cancelar são RPCs online** (`book_tour`, `cancel_booking`): a vaga precisa ser checada no servidor, com a linha da data travada (`for update`). O id da reserva é gerado no aparelho, então repetir a chamada não reserva duas vezes. O app guarda a linha devolvida (`repos.bookings.applyBooking`) sem passar pelo outbox; datas e reservas descem no sync e aparecem offline. Erros com cópia própria: `sold_out`, `already_booked`, `closed` (dia de hoje ou passado). Uma reserva ativa por passeio.
- **Datas.** `tour_schedules` (só servidor) diz quantas vagas e quantos dias à frente cada passeio abre; o pg_cron roda `open_tour_slots()` todo dia às 03:05 UTC. Datas avulsas podem ser inseridas direto em `tour_slots`. "Hoje" é o `current_date` do servidor (UTC), e o app compara em UTC também.
- **Lembrete.** `booking_reminders()` roda às 12:00 UTC (9h de Brasília) e manda "Amanhã tem {passeio}" uma vez por reserva.
- **Anuncie** grava em `businesses` pelo outbox (funciona offline). Entra sempre `review`; o app não muda o `status` (trigger `guard_business`). A equipe aprova ou recusa pelo painel e o dono recebe a notificação `business`.

### Operação pelo painel (equipe)

- **Novo passeio:** linha em `catalog` com `kind = 'passeios'`, `key` = id do passeio e o JSON no formato de `Tour` (`apps/mobile/src/mocks/types.ts`). Depois, uma linha em `tour_schedules` (`tour_id`, `capacity`, `days_ahead`, `weekdays`) e, para abrir as datas na hora, `select public.open_tour_slots();`.
- **Fechar uma data:** `update tour_slots set deleted_at = now() where …` (reservas existentes continuam valendo).
- **Aprovar negócio:** `update businesses set status = 'approved' where id = …` (ou `'rejected'`).
- **Reservas de um passeio:** `select * from bookings where tour_id = … and status = 'confirmed' order by date;`.

## Notificações push (fase 4)

- **Toda notificação vira push.** Um trigger em `notifications` (`push_notification()`) monta o texto e enfileira um envio para a API do Expo via pg_net, depois do commit. Se o push falhar, a ação que criou a notificação (convite, reserva…) não é desfeita.
- **Mesmo texto do app.** A cópia é `explore.notifs` do `@worlo/i18n`, gerada em `supabase/seeds/push.sql` (`push_templates`) pelo `pnpm --filter @worlo/mobile db:seed:generate`; `push_body()` aplica as variáveis e o plural. Mudou texto em `explore.notifs`? Rode o gerador (a CI acusa se esquecer).
- **Aparelhos.** O token e o idioma do app ficam em `devices` (`push_token`, `language`) e sobem pelo outbox. Só aparelhos com sessão viva recebem: sair da conta ou "Desconectar" encerra a sessão e corta o push. Um token pertence a uma conta só (`claim_push_token`). Simuladores não têm token.
- **Preferências.** Os interruptores de Configurações › Notificações calam o push (Memórias, Comunidade: seguir/comentário/confirmações, Roteiros: lembretes de viagem). A lista dentro do app continua com tudo. Convites, atividade de viagem, lembrete de passeio e Anuncie sempre vão.
- **Limpeza.** `push_cleanup()` roda a cada 15 min (pg_cron) e apaga tokens que o Expo devolveu como `DeviceNotRegistered` (app desinstalado).
- **No app.** A permissão é pedida ao entrar na conta. Se estiver negada, Configurações mostra "Notificações desligadas" com atalho para os ajustes do sistema. Tocar no push abre a mesma tela que a linha em Notificações (`notificationTarget`); o número no ícone do app é o total de não lidas.
- **Credenciais (uma vez).** iOS: chave APNs no EAS (`eas credentials`). Android: projeto Firebase, `google-services.json` como variável de arquivo `GOOGLE_SERVICES_JSON` no EAS e a chave de conta de serviço FCM v1 no EAS. Sem o arquivo, o Android funciona normalmente, só sem push.

## Decisões e limites conhecidos

- **Conflitos: last-write-wins por registro.** A última versão enviada ao servidor vence. Enquanto houver mutação local pendente, o pull não sobrescreve aquele registro. Roteiros guardam os dias num JSON (`itineraries.days`): duas pessoas editando o mesmo roteiro offline → vence a última. Quando houver colaboração em tempo real (fase 2), dias/paradas viram linhas próprias.
- **Marcações sem conflito.** Países visitados, salvos e o registro do modo viagem são linhas próprias; dois aparelhos marcando o mesmo país offline geram duas linhas, que a leitura junta (e desmarcar remove todas).
- **Cursor por `updated_at`.** Uma transação longa no servidor pode commitar com timestamp anterior ao cursor de outro cliente e não ser vista. Com escritas curtas (upserts do próprio app) o risco é baixo. Se virar problema, troque por um cursor de sequência lógica (por exemplo, `xid`) ou adote [PowerSync](https://www.powersync.com/), que usa as mesmas convenções de tabela.
- **Escritas recusadas não travam a fila.** Erros que tentar de novo não resolve (códigos Postgres 42, 23, 22, P0: permissão/RLS, constraint, dado inválido) tiram só a linha culpada da fila (ela vai para `_sync_rejected`, para diagnóstico) e o resto segue. Erros de rede continuam no outbox com retry e backoff. Mesmo assim, os repositórios validam tudo que o Postgres checa (`ValidationError`) para que isso seja exceção.
