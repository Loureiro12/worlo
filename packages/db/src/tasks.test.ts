import { describe, expect, it, vi } from 'vitest';
import { createLocalStore } from './local-store';
import { createTasksRepository, TaskValidationError } from './tasks';
import { createTestDatabase, generateId, sequentialClock } from './test-utils';

function setup() {
  const db = createTestDatabase();
  const onChange = vi.fn();
  const repo = createTasksRepository(db, { generateId, now: sequentialClock(), onChange });
  return { db, repo, onChange, store: createLocalStore(db) };
}

describe('tasks repository', () => {
  it('creates a task and records it in the outbox', async () => {
    const { repo, store, onChange } = setup();

    const task = repo.create('  Buy milk  ');

    expect(task).toMatchObject({ title: 'Buy milk', completed: false, deletedAt: null });
    expect(repo.listQuery().all()).toEqual([task]);
    const [mutation] = await store.pendingMutations(10);
    expect(mutation).toMatchObject({
      table: 'tasks',
      recordId: task.id,
      payload: { id: task.id, title: 'Buy milk', completed: false, deleted_at: null },
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('rejects blank titles', () => {
    const { repo, onChange } = setup();
    expect(() => repo.create('   ')).toThrow(TaskValidationError);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lists pending tasks first, newest first', () => {
    const { repo } = setup();
    const a = repo.create('a');
    const b = repo.create('b');
    const c = repo.create('c');
    repo.setCompleted(c.id, true);

    expect(
      repo
        .listQuery()
        .all()
        .map((t) => t.title),
    ).toEqual(['b', 'a', 'c']);
    expect(a.createdAt < b.createdAt).toBe(true);
  });

  it('soft deletes so the deletion can be synced', async () => {
    const { repo, store } = setup();
    const task = repo.create('temp');

    repo.remove(task.id);

    expect(repo.listQuery().all()).toEqual([]);
    const mutations = await store.pendingMutations(10);
    expect(mutations.at(-1)?.payload.deleted_at).toEqual(expect.any(String));
  });
});
