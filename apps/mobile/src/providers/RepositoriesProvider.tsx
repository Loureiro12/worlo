import { createTasksRepository, type TasksRepository } from '@worlo/db';
import { randomUUID } from 'expo-crypto';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { useSync } from '@/features/sync/SyncProvider';
import { db } from '@/lib/database';

type Repositories = { tasks: TasksRepository };

const RepositoriesContext = createContext<Repositories | null>(null);

export function RepositoriesProvider({ children }: { children: ReactNode }) {
  const { notifyLocalChange } = useSync();
  const [repositories] = useState<Repositories>(() => ({
    tasks: createTasksRepository(db, { generateId: randomUUID, onChange: notifyLocalChange }),
  }));
  return (
    <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const context = useContext(RepositoriesContext);
  if (!context) throw new Error('useRepositories must be used inside <RepositoriesProvider>');
  return context;
}
