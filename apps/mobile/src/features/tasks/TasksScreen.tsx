import { useTranslation } from '@worlo/i18n';
import { Divider, HStack, Screen, Text } from '@worlo/ui';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { SyncStatusBadge } from '@/features/sync/SyncStatusBadge';
import { useRepositories } from '@/providers/RepositoriesProvider';
import { NewTaskForm } from './NewTaskForm';
import { TaskItem } from './TaskItem';

export function TasksScreen() {
  const { t } = useTranslation();
  const { tasks: repo } = useRepositories();
  // Reads come straight from SQLite and re-render on every local write.
  const query = useMemo(() => repo.listQuery(), [repo]);
  const { data: tasks } = useLiveQuery(query);
  const remaining = tasks.filter((task) => !task.completed).length;

  const toggle = useCallback((id: string, done: boolean) => repo.setCompleted(id, done), [repo]);
  const remove = useCallback((id: string) => repo.remove(id), [repo]);

  return (
    <Screen testID="tasks-screen">
      <HStack justify="space-between" wrap gap="sm">
        <Text variant="label" tone="muted" testID="tasks-remaining">
          {t('tasks.remaining', { count: remaining })}
        </Text>
        <SyncStatusBadge />
      </HStack>
      <NewTaskForm onCreate={(title) => repo.create(title)} />
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => <TaskItem task={item} onToggle={toggle} onDelete={remove} />}
        ItemSeparatorComponent={Divider}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text testID="tasks-empty" tone="muted" align="center">
            {t('tasks.empty')}
          </Text>
        }
      />
    </Screen>
  );
}
