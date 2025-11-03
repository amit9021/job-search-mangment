import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TasksPage } from '../TasksPage';

vi.mock('../../api/ApiProvider', () => ({
  useApi: () => ({
    get: vi.fn(async () => ({ data: [] }))
  })
}));

vi.mock('../../api/hooks', () => ({
  useTasksQuery: () => ({
    data: [
      {
        id: 'task_1',
        title: 'Follow up with Dana',
        description: 'Send a quick nudge email.',
        status: 'Todo',
        priority: 'High',
        tags: ['followup'],
        dueAt: new Date().toISOString(),
        startAt: null,
        recurrence: null,
        source: 'Manual',
        checklist: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
        links: {},
        context: {
          job: null,
          contact: null,
          grow: null
        }
      }
    ],
    isLoading: false
  }),
  useTaskKpisQuery: () => ({
    data: {
      dueToday: 1,
      overdue: 0,
      velocity7d: 3,
      streak: 2
    }
  }),
  useTaskUpdateMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useTaskDeleteMutation: () => ({ mutate: vi.fn() }),
  useTaskSnoozeMutation: () => ({ mutate: vi.fn() }),
  useTaskQuickParseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTaskCreateMutation: () => ({ mutateAsync: vi.fn(), isPending: false })
}));

describe('TasksPage', () => {
  it('renders KPI tiles and quick add bar', () => {
    render(<TasksPage />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Quick add/i)).toBeInTheDocument();
    expect(screen.getByText('Follow up with Dana')).toBeInTheDocument();
  });
});
