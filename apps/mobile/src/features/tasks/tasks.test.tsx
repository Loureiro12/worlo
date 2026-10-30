import { fireEvent, screen } from '@testing-library/react-native';
import { type Task, TaskValidationError } from '@worlo/db';
import { renderWithProviders } from '@/test-utils';
import { NewTaskForm } from './NewTaskForm';
import { TaskItem } from './TaskItem';

describe('NewTaskForm', () => {
  it('creates a task and clears the field', async () => {
    const onCreate = jest.fn();
    await renderWithProviders(<NewTaskForm onCreate={onCreate} />);

    await fireEvent.changeText(screen.getByLabelText('New task'), 'Buy milk');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    expect(onCreate).toHaveBeenCalledWith('Buy milk');
    expect(screen.getByLabelText('New task')).toHaveDisplayValue('');
  });

  it('shows the translated validation error', async () => {
    const onCreate = jest.fn(() => {
      throw new TaskValidationError('titleRequired');
    });
    await renderWithProviders(<NewTaskForm onCreate={onCreate} />, { language: 'pt-BR' });

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Digite um título para a tarefa.');
  });
});

describe('TaskItem', () => {
  const task: Task = {
    id: '1',
    title: 'Buy milk',
    completed: false,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z',
    deletedAt: null,
  };

  it('toggles and deletes through accessible controls', async () => {
    const onToggle = jest.fn();
    const onDelete = jest.fn();
    await renderWithProviders(<TaskItem task={task} onToggle={onToggle} onDelete={onDelete} />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mark "Buy milk" as done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete "Buy milk"' }));

    expect(onToggle).toHaveBeenCalledWith('1', true);
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
