import { and, asc, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { LocalDatabase } from './database';
import {
  activities,
  type ChatThread,
  chatMembers,
  chatThreads,
  devices,
  type EntityType,
  follows,
  type Membership,
  memberships,
  messages,
  notifications,
  outbox,
  people,
  photoFiles,
  photos,
  tripExpenses,
  trips,
  wishDestinations,
} from './schema';
import { requiredText, ValidationError, type Writer } from './writer';

/**
 * Phase 2 repositories: people, follows, collaboration, activity,
 * notifications, chat, photos and devices. Same rules as `repositories.ts`:
 * sync reads, validated writes through the outbox.
 */
export function createSocialRepositories(db: LocalDatabase, w: Writer, me: () => string | null) {
  const requireMe = () => {
    const id = me();
    if (!id) throw new Error('Not signed in');
    return id;
  };
  const alive = <T extends { deletedAt: string | null }>(rows: T[]) =>
    rows.filter((r) => !r.deletedAt);
  /** Several rows for one key (two devices offline): the newest wins. */
  const latestBy = <T extends { updatedAt: string }>(rows: T[], key: (row: T) => string) => {
    const map = new Map<string, T>();
    for (const row of rows) {
      const current = map.get(key(row));
      if (!current || current.updatedAt <= row.updatedAt) map.set(key(row), row);
    }
    return [...map.values()];
  };

  const peopleRepo = {
    get: (id: string) => db.select().from(people).where(eq(people.id, id)).get(),
    /** Everyone the device knows (related people and experts), by name. */
    list: () =>
      db.select().from(people).where(isNull(people.deletedAt)).orderBy(asc(people.name)).all(),
    byIds: (ids: string[]) =>
      ids.length ? db.select().from(people).where(inArray(people.id, ids)).all() : [],
    experts: () => peopleRepo.list().filter((p) => p.expertRole !== null && p.id !== me()),
  };

  const followsRepo = {
    rows: () => alive(db.select().from(follows).all()),
    /** People I follow. */
    following: () => [
      ...new Set(
        followsRepo
          .rows()
          .filter((f) => f.userId === me())
          .map((f) => f.followeeId),
      ),
    ],
    /** People who follow me. */
    followers: () => [
      ...new Set(
        followsRepo
          .rows()
          .filter((f) => f.followeeId === me())
          .map((f) => f.userId),
      ),
    ],
    isFollowing: (personId: string) => followsRepo.following().includes(personId),
    /** Follow ↔ unfollow. Returns the new state. */
    toggle(personId: string): boolean {
      const userId = requireMe();
      if (personId === userId) throw new ValidationError('followSelf');
      const rows = followsRepo
        .rows()
        .filter((f) => f.userId === userId && f.followeeId === personId);
      if (!rows.length) {
        w.put('follows', { ...w.fresh(), userId, followeeId: personId });
        return true;
      }
      const ts = w.stamp();
      w.batch((put) => {
        for (const row of rows) put('follows', { ...row, deletedAt: ts, updatedAt: ts });
      });
      return false;
    },
  };

  const ownerOf = (type: EntityType, id: string) =>
    type === 'trip'
      ? db.select({ userId: trips.userId }).from(trips).where(eq(trips.id, id)).get()?.userId
      : db
          .select({ userId: wishDestinations.userId })
          .from(wishDestinations)
          .where(eq(wishDestinations.id, id))
          .get()?.userId;

  const collab = {
    /** Latest membership per person on a trip / wish (all statuses). */
    members(type: EntityType, id: string): Membership[] {
      const rows = alive(
        db
          .select()
          .from(memberships)
          .where(and(eq(memberships.entityType, type), eq(memberships.entityId, id)))
          .orderBy(asc(memberships.createdAt))
          .all(),
      );
      return latestBy(rows, (m) => m.userId);
    },
    /** Owner = the entity's userId (null on rows created before phase 2 = me). */
    isOwner(type: EntityType, id: string) {
      const owner = ownerOf(type, id);
      return owner == null || owner === me();
    },
    ownerOf,
    mine: (type: EntityType, id: string) => collab.members(type, id).find((m) => m.userId === me()),
    canEdit(type: EntityType, id: string) {
      return collab.isOwner(type, id) || collab.mine(type, id)?.status === 'accepted';
    },
    /** Invites people (pending). Skips the owner and anyone already pending/accepted. */
    invite(type: EntityType, id: string, userIds: string[]): Membership[] {
      const invitedBy = requireMe();
      if (!collab.canEdit(type, id)) throw new ValidationError('notEditor');
      const owner = ownerOf(type, id) ?? invitedBy;
      const active = new Set(
        collab
          .members(type, id)
          .filter((m) => m.status === 'pending' || m.status === 'accepted')
          .map((m) => m.userId),
      );
      const fresh = [...new Set(userIds)].filter(
        (u) => u !== owner && u !== invitedBy && !active.has(u),
      );
      if (!fresh.length) return [];
      return w.batch((put) =>
        fresh.map((userId) =>
          put('memberships', {
            ...w.fresh(),
            userId,
            entityType: type,
            entityId: id,
            role: 'collaborator',
            status: 'pending',
            invitedBy,
          }),
        ),
      );
    },
    /** Invites waiting for my answer. */
    pendingInvites: () =>
      latestBy(
        alive(db.select().from(memberships).where(eq(memberships.userId, requireMe())).all()),
        (m) => `${m.entityType}:${m.entityId}`,
      ).filter((m) => m.status === 'pending'),
    respond(type: EntityType, id: string, accept: boolean): Membership {
      const mine = collab.mine(type, id);
      if (mine?.status !== 'pending') throw new ValidationError('noPendingInvite');
      return w.put('memberships', {
        ...mine,
        status: accept ? 'accepted' : 'declined',
        updatedAt: w.stamp(),
      });
    },
    leave(type: EntityType, id: string) {
      const mine = collab.mine(type, id);
      if (mine?.status !== 'accepted') throw new ValidationError('notMember');
      w.put('memberships', { ...mine, status: 'removed', updatedAt: w.stamp() });
      collab.prune();
    },
    /** Owner removes someone (pending or accepted). */
    remove(type: EntityType, id: string, userId: string) {
      if (!collab.isOwner(type, id)) throw new ValidationError('notOwner');
      const member = collab.members(type, id).find((m) => m.userId === userId);
      if (!member || member.status === 'removed') return;
      w.put('memberships', { ...member, status: 'removed', updatedAt: w.stamp() });
    },
    /**
     * Drops from the device what I can no longer see: trips/wishes I left, was
     * removed from or declined (and their pending writes, which would be refused).
     * Run after every sync.
     */
    prune() {
      const userId = me();
      if (!userId) return;
      const gone = latestBy(
        alive(db.select().from(memberships).where(eq(memberships.userId, userId)).all()),
        (m) => `${m.entityType}:${m.entityId}`,
      ).filter(
        (m) =>
          (m.status === 'removed' || m.status === 'declined') &&
          ownerOf(m.entityType, m.entityId) !== userId,
      );
      if (!gone.length) return;
      db.transaction((tx) => {
        for (const m of gone) {
          const records: [string, string[]][] = [];
          if (m.entityType === 'trip') {
            const expenseIds = tx
              .select({ id: tripExpenses.id })
              .from(tripExpenses)
              .where(eq(tripExpenses.tripId, m.entityId))
              .all()
              .map((r) => r.id);
            records.push(['trips', [m.entityId]], ['trip_expenses', expenseIds]);
            tx.delete(tripExpenses).where(eq(tripExpenses.tripId, m.entityId)).run();
            // Other people's photos of that trip; mine stay mine.
            tx.delete(photos)
              .where(and(eq(photos.tripId, m.entityId), ne(photos.userId, userId)))
              .run();
            tx.delete(trips).where(eq(trips.id, m.entityId)).run();
          } else {
            records.push(['wish_destinations', [m.entityId]]);
            tx.delete(wishDestinations).where(eq(wishDestinations.id, m.entityId)).run();
          }
          tx.delete(activities)
            .where(
              and(eq(activities.entityType, m.entityType), eq(activities.entityId, m.entityId)),
            )
            .run();
          // Keep my own membership row: it is what says the entity is gone.
          tx.delete(memberships)
            .where(
              and(
                eq(memberships.entityType, m.entityType),
                eq(memberships.entityId, m.entityId),
                ne(memberships.userId, userId),
              ),
            )
            .run();
          for (const [table, ids] of records) {
            if (ids.length) {
              tx.delete(outbox)
                .where(and(eq(outbox.tableName, table), inArray(outbox.recordId, ids)))
                .run();
            }
          }
        }
      });
      w.notify(['trips', 'wish_destinations', 'memberships']);
    },
  };

  const activitiesRepo = {
    forEntity: (type: EntityType, id: string) =>
      db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.entityType, type),
            eq(activities.entityId, id),
            isNull(activities.deletedAt),
          ),
        )
        .orderBy(desc(activities.createdAt))
        .all(),
  };

  const notificationsRepo = {
    /** Newest first. */
    list: () =>
      db
        .select()
        .from(notifications)
        .where(isNull(notifications.deletedAt))
        .orderBy(desc(notifications.createdAt))
        .all(),
    unreadCount: () => notificationsRepo.list().filter((n) => !n.readAt).length,
    markRead(id: string) {
      const row = notificationsRepo.list().find((n) => n.id === id);
      if (!row || row.readAt) return;
      const ts = w.stamp();
      w.put('notifications', { ...row, readAt: ts, updatedAt: ts });
    },
    markAllRead() {
      const unread = notificationsRepo.list().filter((n) => !n.readAt);
      if (!unread.length) return;
      const ts = w.stamp();
      w.batch((put) => {
        for (const row of unread) put('notifications', { ...row, readAt: ts, updatedAt: ts });
      });
    },
  };

  const chat = {
    /** Threads I'm in, most recent conversation first. */
    threads(): ChatThread[] {
      const mine = new Set(
        alive(db.select().from(chatMembers).where(eq(chatMembers.userId, requireMe())).all()).map(
          (m) => m.threadId,
        ),
      );
      return alive(db.select().from(chatThreads).all())
        .filter((t) => mine.has(t.id))
        .sort((a, b) =>
          (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
        );
    },
    members: (threadId: string) =>
      alive(db.select().from(chatMembers).where(eq(chatMembers.threadId, threadId)).all()),
    /** The other person of a direct thread. */
    otherMember: (threadId: string) =>
      chat.members(threadId).find((m) => m.userId !== me())?.userId ?? null,
    /** Existing direct thread with someone (opening a new one is an online RPC). */
    threadWith: (personId: string) =>
      chat
        .threads()
        .find((t) => t.kind === 'direct' && chat.members(t.id).some((m) => m.userId === personId)),
    supportThread: () => chat.threads().find((t) => t.kind === 'support'),
    /** Oldest first. */
    messages: (threadId: string) =>
      db
        .select()
        .from(messages)
        .where(and(eq(messages.threadId, threadId), isNull(messages.deletedAt)))
        .orderBy(asc(messages.createdAt))
        .all(),
    /** Works offline: the message waits in the outbox. */
    send(threadId: string, text: string) {
      const userId = requireMe();
      if (!chat.members(threadId).some((m) => m.userId === userId)) {
        throw new ValidationError('notInThread');
      }
      return w.put('messages', {
        ...w.fresh(),
        threadId,
        userId,
        text: requiredText(text, 2000, 'text'),
      });
    },
    markRead(threadId: string) {
      const mine = chat.members(threadId).find((m) => m.userId === me());
      if (!mine) return;
      const ts = w.stamp();
      w.put('chat_members', { ...mine, lastReadAt: ts, updatedAt: ts });
    },
    unreadCount(threadId: string) {
      const userId = me();
      const lastRead = chat.members(threadId).find((m) => m.userId === userId)?.lastReadAt ?? '';
      return chat.messages(threadId).filter((m) => m.userId !== userId && m.createdAt > lastRead)
        .length;
    },
  };

  const photosRepo = {
    /** Newest first; `tripId` null = photos not in a trip yet. */
    list(filter: { tripId?: string | null } = {}) {
      const rows = alive(db.select().from(photos).all());
      return rows
        .filter((p) => filter.tripId === undefined || p.tripId === filter.tripId)
        .sort((a, b) => (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt));
    },
    get: (id: string) => w.get('photos', id),
    /** A picked photo: metadata now (synced), the file uploads later (`_photo_files`). */
    add(input: {
      localUri: string;
      mimeType?: string;
      tripId?: string | null;
      width?: number | null;
      height?: number | null;
      takenAt?: string | null;
      lat?: number | null;
      lng?: number | null;
      caption?: string | null;
    }) {
      const userId = requireMe();
      const fresh = w.fresh();
      const mimeType = input.mimeType ?? 'image/jpeg';
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      if ((input.caption?.length ?? 0) > 500) throw new ValidationError('caption');
      const photo = w.put('photos', {
        ...fresh,
        userId,
        tripId: input.tripId ?? null,
        storagePath: `${userId}/${fresh.id}.${ext}`,
        width: input.width ?? null,
        height: input.height ?? null,
        takenAt: input.takenAt ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        caption: input.caption ?? null,
        uploaded: false,
      });
      db.insert(photoFiles)
        .values({ photoId: photo.id, localUri: input.localUri, mimeType, state: 'pending' })
        .run();
      return photo;
    },
    file: (photoId: string) =>
      db.select().from(photoFiles).where(eq(photoFiles.photoId, photoId)).get(),
    /** Waiting for upload (failed ones retry up to 5 times). */
    pendingUploads: () =>
      db
        .select()
        .from(photoFiles)
        .all()
        .filter((f) => f.state === 'pending' || (f.state === 'failed' && f.attempts < 5)),
    setUploadState(photoId: string, state: 'uploading' | 'failed', error?: string) {
      const file = photosRepo.file(photoId);
      if (!file) return;
      db.update(photoFiles)
        .set({
          state,
          attempts: state === 'failed' ? file.attempts + 1 : file.attempts,
          lastError: error ?? null,
        })
        .where(eq(photoFiles.photoId, photoId))
        .run();
      w.notify(['_photo_files']);
    },
    markUploaded(photoId: string) {
      db.update(photoFiles)
        .set({ state: 'done', lastError: null })
        .where(eq(photoFiles.photoId, photoId))
        .run();
      const photo = w.getOrThrow('photos', photoId);
      w.put('photos', { ...photo, uploaded: true, updatedAt: w.stamp() });
    },
    /** Legenda (≤ 500), kept with the photo wherever it is shown. */
    setCaption(photoId: string, caption: string | null) {
      const value = caption?.trim() || null;
      if ((value?.length ?? 0) > 500) throw new ValidationError('caption');
      const photo = w.getOrThrow('photos', photoId);
      w.put('photos', { ...photo, caption: value, updatedAt: w.stamp() });
    },
    assign(photoId: string, tripId: string | null) {
      const photo = w.getOrThrow('photos', photoId);
      w.put('photos', { ...photo, tripId, updatedAt: w.stamp() });
    },
    remove(photoId: string) {
      const ts = w.stamp();
      w.put('photos', { ...w.getOrThrow('photos', photoId), deletedAt: ts, updatedAt: ts });
    },
  };

  const devicesRepo = {
    list: () =>
      alive(db.select().from(devices).all())
        .filter((d) => !d.revokedAt)
        .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)),
    get: (id: string) => db.select().from(devices).where(eq(devices.id, id)).get(),
    /** This phone: created on sign-in, `lastSeenAt` refreshed on app start. */
    register(input: {
      id: string;
      name: string;
      platform: string;
      sessionId: string | null;
      /** Expo push token; null keeps the one already registered (no permission prompt yet). */
      pushToken: string | null;
      language: string;
    }) {
      const userId = requireMe();
      const existing = devicesRepo.get(input.id);
      const ts = w.stamp();
      return w.put('devices', {
        ...(existing ?? { ...w.fresh(), id: input.id, revokedAt: null }),
        userId,
        name: input.name.slice(0, 80),
        platform: input.platform.slice(0, 20),
        sessionId: input.sessionId,
        pushToken: input.pushToken ?? existing?.pushToken ?? null,
        language: input.language,
        lastSeenAt: ts,
        updatedAt: ts,
      });
    },
  };

  return {
    people: peopleRepo,
    follows: followsRepo,
    collab,
    activities: activitiesRepo,
    notifications: notificationsRepo,
    chat,
    photos: photosRepo,
    devices: devicesRepo,
  };
}
