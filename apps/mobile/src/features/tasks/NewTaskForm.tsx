import { TaskValidationError } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { Button, HStack, TextField } from '@worlo/ui';
import { useState } from 'react';

export function NewTaskForm({ onCreate }: { onCreate: (title: string) => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      onCreate(title);
      setTitle('');
      setError(null);
    } catch (e) {
      if (!(e instanceof TaskValidationError)) throw e;
      setError(t(`tasks.errors.${e.code}`));
    }
  };

  return (
    <HStack gap="sm" align="flex-start">
      <TextField
        testID="new-task-input"
        label={t('tasks.newLabel')}
        hideLabel
        placeholder={t('tasks.newPlaceholder')}
        value={title}
        error={error}
        onChangeText={(text) => {
          setTitle(text);
          if (error) setError(null);
        }}
        onSubmitEditing={submit}
        returnKeyType="done"
        submitBehavior="submit"
      />
      <Button testID="add-task-button" label={t('common.add')} onPress={submit} />
    </HStack>
  );
}
