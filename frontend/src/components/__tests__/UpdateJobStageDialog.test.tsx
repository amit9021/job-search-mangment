import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { UpdateJobStageDialog } from '../UpdateJobStageDialog';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useUpdateJobStageMutation: vi.fn()
  };
});

import * as hooks from '../../api/hooks';

const useUpdateJobStageMutation = vi.mocked(hooks.useUpdateJobStageMutation);

describe('UpdateJobStageDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useUpdateJobStageMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('submits selected stage with note', async () => {
    const mutateSpy = vi.fn().mockResolvedValue({ job: { id: 'job_1', stage: 'HR' } });
    useUpdateJobStageMutation.mockReturnValue({ mutateAsync: mutateSpy, isPending: false });

    const onOpenChange = vi.fn();

    render(
      <UpdateJobStageDialog
        jobId="job_1"
        currentStage="APPLIED"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'HR' } });
    fireEvent.change(screen.getByPlaceholderText(/optional context/i), { target: { value: 'Moved to HR' } });
    fireEvent.click(screen.getByRole('button', { name: /update stage/i }));

    await waitFor(() => {
      expect(mutateSpy).toHaveBeenCalledWith({ jobId: 'job_1', stage: 'HR', note: 'Moved to HR' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
