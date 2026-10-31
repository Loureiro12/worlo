# 05 · Modelo de dados e API sugerida

Tipos em TypeScript. IDs são `string` (UUID). Datas ISO 8601. Moedas ISO 4217.

```ts
type User = {
  id: string; name: string; username: string; city?: string; bio?: string;
  avatarUrl?: string; email: string; emailVerified: boolean;
  language: 'pt-BR'|'pt-PT'|'en'|'es'|'fr'; currency: string; units: 'metric'|'imperial';
  privacy: 'private'|'friends'|'public';
  privacyDetail: { map: boolean; trips: boolean; photos: boolean; searchable: boolean }; // gastos sempre privados
  notifications: { memories: boolean; community: boolean; itineraries: boolean; promos: boolean };
  twoFactor: boolean; createdAt: string;
};

type CountryStatus = 'visited'|'planned'|'wishlist';
type UserCountry = { userId: string; countryIso: string /* ISO 3166 numeric, ex '076' */; status: CountryStatus; years: string[] };

type Trip = {
  id: string; ownerId: string; kind: 'past'; title: string;
  place: string; countryIso: string; startDate?: string; endDate?: string; periodLabel: string; year: string;
  coverUrl?: string; tripType?: 'solo'|'couple'|'family'|'friends'|'work';
  food?: string; shopping?: string; experiences: string[];
  stats: { days: number; photos: number; places: number };
};

type WishDestination = { id: string; ownerId: string; name: string; countryIso?: string; note?: string; savedAt: string };

type Collaborator = { userId: string; entityType: 'trip'|'wish'|'itinerary'; entityId: string;
  role: 'owner'|'collaborator'; status: 'pending'|'accepted'|'declined'; invitedBy: string; invitedAt: string };

type Activity = { id: string; entityId: string; actorId: string; type: 'photos_added'|'expense_added'|'diary'|'place_added'|'checkin'; text: string; createdAt: string };

type Place = { id: string; name: string; category: 'attraction'|'food'|'shopping'|'transport'|'service'|'lodging';
  cityId: string; lat: number; lng: number; rating?: number; reviews?: number; hours?: string; price?: string; address?: string; avgTime?: string; description?: string };

type VisitedPlace = { tripId: string; placeId: string; rating?: 1|2|3|4|5; note?: string };

type TimelineItem = { id: string; tripId: string; day: number; time?: string; icon: string; title: string; note?: string; extra?: string; photoIds?: string[] };
type DiaryEntry = { id: string; tripId: string; authorId: string; day?: number; text: string; createdAt: string };

type Expense = { id: string; tripId: string; authorId: string; amount: number; currency: string;
  category: 'lodging'|'food'|'tours'|'transport'|'shopping'; description: string; date: string;
  receiptUrl?: string; splitWith: string[] /* userIds; divisão igual com o autor */ };

type Photo = { id: string; ownerId: string; tripId?: string; url: string; takenAt?: string; lat?: number; lng?: number; caption?: string; uploadStatus: 'local'|'uploading'|'uploaded'|'failed' };

type Itinerary = { id: string; ownerId: string; title: string; place: string; countryIso?: string;
  dates?: string; status: 'draft'|'planning'|'live'|'done'; sourceRecommendationId?: string;
  days: { label: string; stops: Stop[] }[] };
type Stop = { id: string; time?: string; icon: string; title: string; note?: string; cost?: number; placeId?: string; tourId?: string; done?: boolean };

type Recommendation = Itinerary & { authorId: string; region: string; saves: number; rating: number };

type LiveSession = { itineraryId: string; currentDay: number; startedAt: string; log: LiveLog[] };
type LiveLog = { id: string; authorId: string; type: 'checkin'|'photo'|'expense'|'note'|'stop_done'; text: string; placeId?: string; rating?: number; photoId?: string; amount?: number; localCurrency?: string; createdAt: string; synced: boolean };

type SavedItem = { userId: string; refType: 'place'|'tour'|'city'; refId: string; savedAt: string };
type Collection = { id: string; ownerId: string; name: string; itemIds: string[] };

type Post = { id: string; authorId: string; type: 'tip'|'review'|'itinerary'|'question';
  placeRef: { type: 'country'|'city'|'region'|'place'|'tour'; id: string; label: string };
  text: string; rating?: number; photoUrls: string[]; tripId?: string; visibility: 'public'|'friends'; createdAt: string };
type Vote = { postId: string; userId: string; value: 'correct'|'wrong' };
type Comment = { id: string; postId: string; authorId: string; text: string; createdAt: string };

type Expert = { userId: string; role: string; area: string; verified: true };
type Follow = { followerId: string; followeeId: string };

type Tour = { id: string; businessId: string; name: string; city: string; category: 'boat'|'food'|'hike'|'culture';
  durationLabel: string; price: number; currency: string; rating: number; reviews: number; languages: string[]; groupMax: number;
  description: string; includes: string[]; meetingPoint: string };
type TourSlot = { tourId: string; date: string; capacity: number; booked: number };
type Booking = { id: string; tourId: string; userId: string; date: string; people: number; total: number; status: 'confirmed'|'cancelled' };
type Business = { id: string; name: string; type: 'guide'|'agency'|'restaurant'|'lodging'; city: string; description?: string; email: string; status: 'review'|'approved' };

type Notification = { id: string; userId: string; type: 'invite'|'activity'|'invite_accepted'|'invite_pending'|'memory'|'community'|'reminder'|'follow';
  actorId?: string; entityType?: string; entityId?: string; text: string; read: boolean; createdAt: string };

type Message = { id: string; threadId: string; fromId: string; text: string; createdAt: string };
type Achievement = { id: string; title: string; icon: string; criteria: string; unlockedAt?: string; progress?: number };
```

## Permissões
| Ação | Dono | Colaborador aceito | Convidado pendente | Outros |
|---|---|---|---|---|
| Ver viagem completa (inclui gastos) | ✓ | ✓ | prévia do convite | conforme privacidade, **sem gastos** |
| Editar título/datas/destino | ✓ | ✓ | — | — |
| Adicionar fotos, lugares, diário, gastos | ✓ | ✓ | — | — |
| Convidar pessoas | ✓ | ✓ | — | — |
| Remover colaboradores | ✓ | — | — | — |
| Excluir viagem | ✓ | sair da viagem | — | — |

## Endpoints sugeridos (REST)
```
POST   /auth/signup | /auth/login | /auth/oauth/{apple|google} | /auth/forgot
GET    /me | PATCH /me | PATCH /me/email | PATCH /me/password | DELETE /me
GET    /me/countries | PUT /me/countries/{iso}
GET    /trips?seg=past | POST /trips | GET/PATCH/DELETE /trips/{id}
GET    /trips/{id}/timeline | /photos | /places | /diary | /expenses | /activity
POST   /trips/{id}/expenses | POST /trips/{id}/collaborators | DELETE /trips/{id}/collaborators/{userId}
GET    /invites | POST /invites/{id}/accept | POST /invites/{id}/decline | POST /trips/{id}/invite-link
GET/POST /wishlist | GET/POST/PATCH /itineraries | POST /itineraries/{id}/start | POST /itineraries/{id}/finish
POST   /live/{itineraryId}/log  (aceita lote offline com client ids)
GET    /recommendations?region= | POST /recommendations/{id}/copy
GET    /countries/{iso} | /regions/{id} | /cities/{id} | /places/{id}
GET    /search?q=&cat=all|dest|place|tour|people|rot
GET/POST/DELETE /saved | GET/POST/PATCH /collections
GET    /feed?seg=foryou|following | GET /experts | POST /posts | GET /posts/{id} | PUT /posts/{id}/vote | POST /posts/{id}/comments
GET    /users/{id} (perfil público) | POST/DELETE /users/{id}/follow
GET    /tours?cat=&q= | GET /tours/{id} | GET /tours/{id}/slots | POST /bookings | POST /businesses
GET    /notifications | POST /notifications/read-all
GET/POST /threads/{id}/messages | POST /support/threads
POST   /photos/import (multipart, retomável) | PATCH /photos/{id} (tripId)
GET    /share/{subject}?format=story|post|square&theme=
POST   /me/export
```

## Estado do cliente (resumo)
- **Sessão:** usuário, tokens, preferências.
- **Navegação:** aba atual, pilhas, sheet aberta (uma por vez; fechar ao navegar).
- **Cache/offline:** viagens, roteiros, sessão do modo viagem, fotos pendentes, salvos (MMKV/SQLite) com fila de sincronização.
- **UI efêmera:** filtros (categoria, ano, segmento), busca (termo, categoria, recentes até 5), formulários com flags de erro, toasts.
- **Feature flags:** modo viagem, área comercial, especialistas.
