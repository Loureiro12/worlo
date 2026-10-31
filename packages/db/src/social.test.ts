import { describe, expect, it } from 'vitest';
import { createLocalStore } from './local-store';
import { createRepositories } from './repositories';
import { syncedTables } from './synced-tables';
import { createTestDatabase, generateId, sequentialClock } from './test-utils';
import { ValidationError } from './writer';

const ANA = '11111111-1111-4111-8111-111111111111';
const BIA = '22222222-2222-4222-8222-222222222222';
const CAIO = '33333333-3333-4333-8333-333333333333';

function setup(userId = ANA) {
  const db = createTestDatabase();
  let current: string | null = userId;
  const repos = createRepositories(db, {
    generateId,
    now: sequentialClock(),
    userId: () => current,
  });
  /** Simulates rows arriving from the server (pull). */
  const pulled = (table: keyof typeof syncedTables, row: Record<string, unknown>) => {
    const { table: target, toLocal } = syncedTables[table];
    const values = toLocal({
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
      deleted_at: null,
      ...row,
    } as never);
    // biome-ignore lint/suspicious/noExplicitAny: test helper
    db.insert(target)
      .values(values as any)
      .onConflictDoUpdate({ target: target.id, set: values as any })
      .run();
  };
  return { db, repos, pulled, signIn: (id: string | null) => (current = id) };
}

describe('ownership', () => {
  it('stamps the signed-in user on trips, wishes and expenses', () => {
    const { repos } = setup();
    const trip = repos.trips.create({ title: 'Jeri' });
    const expense = repos.trips.addExpense(trip.id, { name: 'Pousada', amount: 900 });
    const wish = repos.world.addWish({ name: 'Japão' });
    expect([trip.userId, expense.userId, wish.userId]).toEqual([ANA, ANA, ANA]);
  });
});

describe('follows', () => {
  it('toggles and lists both directions', () => {
    const { repos, pulled } = setup();
    expect(repos.follows.toggle(BIA)).toBe(true);
    pulled('follows', { id: 'f-in', user_id: CAIO, followee_id: ANA });
    expect(repos.follows.following()).toEqual([BIA]);
    expect(repos.follows.followers()).toEqual([CAIO]);
    expect(repos.follows.toggle(BIA)).toBe(false);
    expect(repos.follows.isFollowing(BIA)).toBe(false);
    expect(() => repos.follows.toggle(ANA)).toThrow(ValidationError);
  });
});

describe('collaboration', () => {
  it('invites once per person and never the owner', async () => {
    const { db, repos } = setup();
    const trip = repos.trips.create({ title: 'Jeri' });
    expect(repos.collab.invite('trip', trip.id, [BIA, BIA, ANA]).map((m) => m.userId)).toEqual([
      BIA,
    ]);
    expect(repos.collab.invite('trip', trip.id, [BIA, CAIO]).map((m) => m.userId)).toEqual([CAIO]);
    expect(repos.collab.members('trip', trip.id).map((m) => [m.userId, m.status])).toEqual([
      [BIA, 'pending'],
      [CAIO, 'pending'],
    ]);
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.at(-1)?.payload).toMatchObject({
      user_id: CAIO,
      invited_by: ANA,
      status: 'pending',
    });
  });

  it('answers an invite and only editors can invite', () => {
    const { repos, pulled } = setup(BIA);
    pulled('trips', { id: 't1', user_id: ANA, title: 'Jeri', companions: [] });
    pulled('memberships', {
      id: 'm1',
      user_id: BIA,
      entity_type: 'trip',
      entity_id: 't1',
      role: 'collaborator',
      status: 'pending',
      invited_by: ANA,
    });
    expect(repos.collab.isOwner('trip', 't1')).toBe(false);
    expect(repos.collab.pendingInvites().map((m) => m.entityId)).toEqual(['t1']);
    expect(() => repos.collab.invite('trip', 't1', [CAIO])).toThrow(ValidationError);

    repos.collab.respond('trip', 't1', true);
    expect(repos.collab.canEdit('trip', 't1')).toBe(true);
    expect(repos.collab.pendingInvites()).toEqual([]);
    expect(repos.collab.invite('trip', 't1', [CAIO])).toHaveLength(1);
  });

  it('prunes a trip I was removed from, with its data and pending writes', async () => {
    const { db, repos, pulled } = setup(BIA);
    pulled('trips', { id: 't1', user_id: ANA, title: 'Jeri', companions: [] });
    pulled('memberships', {
      id: 'm1',
      user_id: BIA,
      entity_type: 'trip',
      entity_id: 't1',
      role: 'collaborator',
      status: 'accepted',
      invited_by: ANA,
    });
    repos.trips.addExpense('t1', { name: 'Buggy', amount: 300 });
    pulled('memberships', {
      id: 'm1',
      user_id: BIA,
      entity_type: 'trip',
      entity_id: 't1',
      role: 'collaborator',
      status: 'removed',
      invited_by: ANA,
      updated_at: '2999-01-01T00:00:00.000Z',
    });

    repos.collab.prune();

    expect(repos.trips.get('t1')).toBeUndefined();
    expect(repos.trips.expenses('t1')).toEqual([]);
    expect(await createLocalStore(db).pendingMutations(100)).toEqual([]);
  });

  it('owners are never pruned out of their own trips', () => {
    const { repos } = setup();
    const trip = repos.trips.create({ title: 'Mine' });
    repos.collab.prune();
    expect(repos.trips.get(trip.id)).toBeDefined();
  });
});

describe('notifications', () => {
  it('marks read through the outbox', async () => {
    const { db, repos, pulled } = setup();
    pulled('notifications', { id: 'n1', user_id: ANA, type: 'follow', actor_id: BIA, data: {} });
    pulled('notifications', { id: 'n2', user_id: ANA, type: 'invite', actor_id: BIA, data: {} });
    expect(repos.notifications.unreadCount()).toBe(2);
    repos.notifications.markRead('n1');
    expect(repos.notifications.unreadCount()).toBe(1);
    repos.notifications.markAllRead();
    expect(repos.notifications.unreadCount()).toBe(0);
    expect((await createLocalStore(db).pendingMutations(100)).map((m) => m.recordId)).toEqual([
      'n1',
      'n2',
    ]);
  });
});

describe('chat', () => {
  it('sends offline and counts unread', () => {
    const { repos, pulled } = setup();
    pulled('chat_threads', { id: 'th', kind: 'direct', last_message_at: null });
    pulled('chat_members', { id: 'cm1', thread_id: 'th', user_id: ANA, last_read_at: null });
    pulled('chat_members', { id: 'cm2', thread_id: 'th', user_id: BIA, last_read_at: null });
    pulled('messages', { id: 'msg1', thread_id: 'th', user_id: BIA, text: 'Oi!' });

    expect(repos.chat.threadWith(BIA)?.id).toBe('th');
    expect(repos.chat.otherMember('th')).toBe(BIA);
    expect(repos.chat.unreadCount('th')).toBe(1);
    repos.chat.send('th', 'Oi Bia');
    repos.chat.markRead('th');
    expect(repos.chat.unreadCount('th')).toBe(0);
    expect(repos.chat.messages('th').map((m) => m.text)).toEqual(['Oi!', 'Oi Bia']);
    expect(() => repos.chat.send('other', 'x')).toThrow(ValidationError);
  });
});

describe('photos', () => {
  it('queues the file, uploads, retries a few times', () => {
    const { repos } = setup();
    const trip = repos.trips.create({ title: 'Jeri' });
    const photo = repos.photos.add({ localUri: 'file:///a.jpg', tripId: trip.id });
    expect(photo.storagePath).toBe(`${ANA}/${photo.id}.jpg`);
    expect(repos.photos.pendingUploads().map((f) => f.photoId)).toEqual([photo.id]);

    for (let i = 0; i < 5; i++) repos.photos.setUploadState(photo.id, 'failed', 'offline');
    expect(repos.photos.pendingUploads()).toEqual([]);

    const other = repos.photos.add({ localUri: 'file:///b.png', mimeType: 'image/png' });
    repos.photos.markUploaded(other.id);
    expect(repos.photos.get(other.id)?.uploaded).toBe(true);
    expect(repos.photos.list({ tripId: null }).map((p) => p.id)).toEqual([other.id]);
  });
});

describe('devices', () => {
  it('registers this device and refreshes it', () => {
    const { repos } = setup();
    repos.devices.register({ id: 'dev', name: 'iPhone', platform: 'ios', sessionId: 's1' });
    repos.devices.register({ id: 'dev', name: 'iPhone', platform: 'ios', sessionId: 's2' });
    expect(repos.devices.list()).toHaveLength(1);
    expect(repos.devices.get('dev')?.sessionId).toBe('s2');
  });
});
