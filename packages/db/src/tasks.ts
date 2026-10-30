import { asc, desc, eq, isNull } from 'drizzle-orm';
import type { LocalDatabase } from './database';
import { outbox, type Task, tasks } from './schema';
import { taskMapper } from './synced-tables';

export const TASK_TITLE_MAX_LENGTH = 500;

export class TaskValidationError extends Error {
  constructor(readonly code: 'titleRequired') {
    super(code);
    this.name = 'TaskValidationError';
  }
}

export type TasksRepositoryOptions = {
  generateId: () => string;
  now?: () => Date;
  /** Called after every committed write (e.g. to request a sync). */
  onChange?: () => void;
};

/**
 * All task writes go through here: each one updates the row AND appends the
 * new snapshot to the outbox in a single transaction, so nothing is lost if
 * the app dies before syncing.
 */
export function createTasksRepository(
  db: LocalDatabase,
  { generateId, now = () => new Date(), onChange }: TasksRepositoryOptions,
) {
  function write(task: Task) {
    db.transaction((tx) => {
      tx.insert(tasks).values(task).onConflictDoUpdate({ target: tasks.id, set: task }).run();
      tx.insert(outbox)
        .values({
          tableName: 'tasks',
          recordId: task.id,
          payload: taskMapper.toRemote(task),
          createdAt: task.updatedAt,
        })
        .run();
    });
    onChange?.();
    return task;
  }

  function getOrThrow(id: string): Task {
    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) throw new Error(`Task not found: ${id}`);
    return task;
  }

  return {
    /** Visible tasks: pending first, newest first. Use with `useLiveQuery`. */
    listQuery() {
      return db
        .select()
        .from(tasks)
        .where(isNull(tasks.deletedAt))
        .orderBy(asc(tasks.completed), desc(tasks.createdAt));
    },

    create(rawTitle: string): Task {
      const title = rawTitle.trim().slice(0, TASK_TITLE_MAX_LENGTH);
      if (!title) throw new TaskValidationError('titleRequired');
      const timestamp = now().toISOString();
      return write({
        id: generateId(),
        title,
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
    },

    setCompleted(id: string, completed: boolean): Task {
      return write({ ...getOrThrow(id), completed, updatedAt: now().toISOString() });
    },

    remove(id: string): Task {
      const timestamp = now().toISOString();
      return write({ ...getOrThrow(id), deletedAt: timestamp, updatedAt: timestamp });
    },
  };
}

export type TasksRepository = ReturnType<typeof createTasksRepository>;
