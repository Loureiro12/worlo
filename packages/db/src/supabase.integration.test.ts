import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SyncEngine } from '@worlo/sync';
import { createSupabaseRemoteStore } from '@worlo/sync/supabase';
import { describe, expect, it } from 'vitest';
import { createLocalStore } from './local-store';
import { createRepositories } from './repositories';
import { syncOrder } from './synced-tables';
import { createTestDatabase, generateId } from './test-utils';

/**
 * Real SQLite repositories ↔ real Supabase (local stack or CI): proves every
 * table maps cleanly to Postgres (json, booleans, numerics, nulls) and that RLS
 * accepts what the app writes. Skipped unless configured:
 *   SUPABASE_URL=http://127.0.0.1:56321 SUPABASE_PUBLISHABLE_KEY=... pnpm --filter @worlo/db test
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

describe.runIf(url && key)('SQLite ↔ Supabase', () => {
  async function account(name = 'Ana') {
    const email = `db-${randomUUID()}@example.com`;
    const password = randomUUID();
    const client = () =>
      createClient(url as string, key as string, { auth: { persistSession: false } });
    const first = client();
    const { error } = await first.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return {
      first,
      /** Another device signing in to the same account. */
      async another() {
        const c = client();
        const { error: e } = await c.auth.signInWithPassword({ email, password });
        if (e) throw e;
        return c;
      },
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: untyped test client
  function device(client: SupabaseClient<any, any, any>, userId: string | null = null) {
    const db = createTestDatabase();
    const repos = createRepositories(db, { generateId, userId: () => userId });
    const engine = new SyncEngine({
      local: createLocalStore(db),
      remote: createSupabaseRemoteStore(client),
      tables: syncOrder,
    });
    return { repos, engine };
  }

  it('round-trips every personal table through Postgres', async () => {
    const { first, another } = await account();
    const phone = device(first);

    // The profile is created by the server on sign-up and pulled.
    await phone.engine.sync();
    expect(phone.repos.profile.get()).toMatchObject({ name: 'Ana', currency: 'BRL' });
    phone.repos.profile.update({
      city: 'São Paulo',
      privacyDetail: { map: true, trips: false, photos: false, search: true },
    });

    phone.repos.world.toggleVisited('076', '2024');
    phone.repos.world.addWish({
      name: 'Japão',
      countryIso: '392',
      companions: [{ name: 'Bia', status: 'pending' }],
    });
    const trip = phone.repos.trips.create({ title: 'Kyoto', details: { diary: { text: 'oi' } } });
    phone.repos.trips.addExpense(trip.id, {
      name: 'Ryokan',
      amount: 820.5,
      split: ['Bia'],
      receipt: true,
    });
    const peru = phone.repos.planning.create({
      title: 'Peru',
      days: [{ label: 'Dia 1', items: [] }],
    });
    phone.repos.planning.startLive(peru.id);
    phone.repos.planning.addLog({ type: 'expense', text: 'Almoço', amount: 45 });
    phone.repos.saved.toggle({ refId: 's1', name: 'Belém' });
    phone.repos.saved.createCollection('Lisboa', 's1');
    await phone.engine.sync();
    expect(phone.engine.getStatus().pending).toBe(0);

    const tablet = device(await another());
    await tablet.engine.sync();
    expect(tablet.repos.profile.get()).toMatchObject({
      city: 'São Paulo',
      privacyDetail: { trips: false },
    });
    expect(tablet.repos.world.visitedMap()).toEqual({ '076': ['2024'] });
    expect(tablet.repos.world.wishes()[0]).toMatchObject({
      companions: [{ name: 'Bia', status: 'pending' }],
    });
    expect(tablet.repos.trips.get(trip.id)).toMatchObject({ details: { diary: { text: 'oi' } } });
    expect(tablet.repos.trips.expenses(trip.id)[0]).toMatchObject({
      amount: 820.5,
      receipt: true,
      split: ['Bia'],
    });
    expect(tablet.repos.planning.currentSession()).toMatchObject({
      itineraryId: peru.id,
      active: true,
      spent: 45,
    });
    expect(tablet.repos.saved.collections()[0]).toMatchObject({ name: 'Lisboa', itemIds: ['s1'] });

    // Deletes reach the other device.
    tablet.repos.trips.remove(trip.id);
    await tablet.engine.sync();
    await phone.engine.sync();
    expect(phone.repos.trips.list()).toEqual([]);
  });

  it('shares a trip between two accounts: invite, accept, expenses, removal', async () => {
    const ana = await account('Ana');
    const bia = await account('Bia');
    const anaId = (await ana.first.auth.getUser()).data.user?.id as string;
    const biaId = (await bia.first.auth.getUser()).data.user?.id as string;
    const anaPhone = device(ana.first, anaId);
    const biaPhone = device(bia.first, biaId);

    const trip = anaPhone.repos.trips.create({ title: 'Jeri' });
    anaPhone.repos.trips.addExpense(trip.id, { name: 'Pousada', amount: 900 });
    anaPhone.repos.collab.invite('trip', trip.id, [biaId]);
    await anaPhone.engine.sync();

    // Bia: invite preview (no money), notification and Ana's public profile.
    await biaPhone.engine.sync();
    expect(biaPhone.repos.trips.get(trip.id)).toMatchObject({ title: 'Jeri', userId: anaId });
    expect(biaPhone.repos.trips.expenses(trip.id)).toEqual([]);
    expect(biaPhone.repos.notifications.list().map((n) => n.type)).toEqual(['invite']);
    expect(biaPhone.repos.people.get(anaId)?.name).toBe('Ana');

    // Accepting reveals the expenses created before (visibility bump).
    biaPhone.repos.collab.respond('trip', trip.id, true);
    await biaPhone.engine.sync();
    expect(biaPhone.repos.trips.expenses(trip.id).map((e) => e.name)).toEqual(['Pousada']);
    biaPhone.repos.trips.addExpense(trip.id, { name: 'Buggy', amount: 300, amountLabel: 'R$ 300' });
    biaPhone.repos.trips.update(trip.id, { title: 'Réveillon em Jeri' });
    await biaPhone.engine.sync();
    expect(biaPhone.engine.getStatus().pending).toBe(0);

    await anaPhone.engine.sync();
    expect(anaPhone.repos.trips.get(trip.id)?.title).toBe('Réveillon em Jeri');
    expect(
      anaPhone.repos.trips
        .expenses(trip.id)
        .map((e) => e.name)
        .sort(),
    ).toEqual(['Buggy', 'Pousada']);
    expect(
      anaPhone.repos.notifications
        .list()
        .map((n) => n.type)
        .sort(),
    ).toEqual(['activity', 'invite_accepted']);
    expect(
      anaPhone.repos.activities
        .forEntity('trip', trip.id)
        .map((a) => a.kind)
        .sort(),
    ).toEqual(['expense', 'joined']);

    // Removed: Bia's next sync drops the trip from her phone.
    anaPhone.repos.collab.remove('trip', trip.id, biaId);
    await anaPhone.engine.sync();
    await biaPhone.engine.sync();
    biaPhone.repos.collab.prune();
    expect(biaPhone.repos.trips.get(trip.id)).toBeUndefined();
    expect(biaPhone.repos.trips.expenses(trip.id)).toEqual([]);
  });

  it('books a tour on the server and syncs dates, bookings and Anuncie sign-ups', async () => {
    const ana = await account('Ana');
    const anaId = (await ana.first.auth.getUser()).data.user?.id as string;
    const phone = device(ana.first, anaId);
    await phone.engine.sync();

    // Seeded dates (supabase/seeds): pick one with a seat left.
    const today = new Date().toISOString().slice(0, 10);
    const slot = phone.repos.tours.slots('tejo', today).find((s) => s.capacity > s.booked);
    expect(slot).toBeDefined();
    const before = slot?.booked ?? 0;

    const { data, error } = await ana.first.rpc('book_tour', {
      p_id: randomUUID(),
      p_slot: slot?.id,
      p_people: 1,
    });
    expect(error).toBeNull();
    phone.repos.bookings.applyBooking(data);
    expect(phone.repos.bookings.forTour('tejo')).toMatchObject({ people: 1, total: 45 });

    await phone.engine.sync();
    expect(phone.repos.tours.slot(slot?.id as string)?.booked).toBe(before + 1);
    expect(phone.repos.bookings.list()).toHaveLength(1);

    const again = await ana.first.rpc('book_tour', {
      p_id: randomUUID(),
      p_slot: slot?.id,
      p_people: 1,
    });
    expect(again.error?.message).toBe('already_booked');

    const cancelled = await ana.first.rpc('cancel_booking', { p_id: data.id });
    expect(cancelled.data).toMatchObject({ status: 'cancelled' });
    await phone.engine.sync();
    expect(phone.repos.bookings.list()).toEqual([]);
    expect(phone.repos.tours.slot(slot?.id as string)?.booked).toBe(before);

    // Anuncie: outbox → server, always in review.
    const business = phone.repos.businesses.submit({
      name: 'Tejo Sailing',
      type: 'guide',
      city: 'Lisboa',
      email: 'ola@tejo.pt',
    });
    await phone.engine.sync();
    const row = await ana.first.from('businesses').select('status').eq('id', business.id).single();
    expect(row.data).toEqual({ status: 'review' });
  });

  it('registers push tokens; one phone keeps one account', async () => {
    const ana = await account('Ana');
    const bia = await account('Bia');
    const anaId = (await ana.first.auth.getUser()).data.user?.id as string;
    const biaId = (await bia.first.auth.getUser()).data.user?.id as string;
    const token = `ExponentPushToken[${randomUUID()}]`;
    const phone = { name: 'iPhone', platform: 'ios', sessionId: null, pushToken: token };

    const anaPhone = device(ana.first, anaId);
    anaPhone.repos.devices.register({ ...phone, id: randomUUID(), language: 'en' });
    await anaPhone.engine.sync();
    const mine = await ana.first.from('devices').select('push_token, language').single();
    expect(mine.data).toEqual({ push_token: token, language: 'en' });

    // Bia signs in on the same phone: Ana's account stops getting its pushes.
    const biaPhone = device(bia.first, biaId);
    biaPhone.repos.devices.register({ ...phone, id: randomUUID(), language: 'pt-BR' });
    await biaPhone.engine.sync();
    await anaPhone.engine.sync();
    expect(anaPhone.repos.devices.list()[0]?.pushToken).toBeNull();
  });
});
