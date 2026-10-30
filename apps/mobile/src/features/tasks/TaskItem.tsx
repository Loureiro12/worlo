import type { Task } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { Button, Checkbox, HStack, Text } from '@worlo/ui';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

type Props = {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
};

export const TaskItem = memo(function TaskItem({ task, onToggle, onDelete }: Props) {
  const { t } = useTranslation();
  return (
    <HStack gap="sm">
      <Checkbox
        testID={`task-toggle-${task.title}`}
        checked={task.completed}
        onChange={(completed) => onToggle(task.id, completed)}
        accessibilityLabel={t('tasks.toggle', { title: task.title })}
      />
      <Text
        style={[styles.title, task.completed && styles.completed]}
        tone={task.completed ? 'subtle' : 'default'}
      >
        {task.title}
      </Text>
      <Button
        testID={`task-delete-${task.title}`}
        variant="ghost"
        size="sm"
        label={t('common.delete')}
        accessibilityLabel={t('tasks.deleteA11y', { title: task.title })}
        onPress={() => onDelete(task.id)}
      />
    </HStack>
  );
});

const styles = StyleSheet.create({
  title: { flex: 1 },
  completed: { textDecorationLine: 'line-through' },
});
