import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { JobWizardModal } from '../JobWizardModal';
import { ToastProvider } from '../ToastProvider';
import type { CreateJobMutationInput } from '../../api/hooks';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useCreateJobMutation: vi.fn(),
    useUpdateJobMutation: vi.fn(),
    useJobDetailQuery: vi.fn()
  };
});

import * as hooksModule from '../../api/hooks';

const useCreateJobMutation = vi.mocked(hooksModule.useCreateJobMutation);
const useUpdateJobMutation = vi.mocked(hooksModule.useUpdateJobMutation);
const useJobDetailQuery = vi.mocked(hooksModule.useJobDetailQuery);

const setupMocks = () => {
  const createJobSpy = vi.fn<Promise<void>, [CreateJobMutationInput]>();
  const updateJobSpy = vi.fn();

  useCreateJobMutation.mockReturnValue({ mutateAsync: createJobSpy, isPending: false });
  useUpdateJobMutation.mockReturnValue({ mutateAsync: updateJobSpy, isPending: false });
  useJobDetailQuery.mockReturnValue({ data: null });

  return { createJobSpy, updateJobSpy };
};

const renderWizard = () =>
  render(
    <ToastProvider>
      <JobWizardModal />
    </ToastProvider>
  );

describe('JobWizardModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('submits normalized payload for new job creation', async () => {
    const { createJobSpy } = setupMocks();
    createJobSpy.mockResolvedValue();

    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: /add job/i }));

    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Senior Engineer' } });
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: '2025-01-10' } });
    fireEvent.change(screen.getByLabelText(/tailoring score/i), { target: { value: '82' } });

    fireEvent.click(screen.getByRole('button', { name: /create job/i }));

    await waitFor(() => expect(createJobSpy).toHaveBeenCalled());
    const payload = createJobSpy.mock.calls[0][0];
    expect(payload).toMatchObject({
      company: 'Acme Corp',
      role: 'Senior Engineer',
      deadline: new Date('2025-01-10').toISOString(),
      initialApplication: expect.objectContaining({ tailoringScore: 82 })
    });
  });

  it('surfaces field validation errors from the server response', async () => {
    const { createJobSpy } = setupMocks();
    const error = {
      isAxiosError: true,
      message: 'Bad Request',
      response: {
        data: {
          message: 'Validation failed',
          details: {
            errors: {
              fieldErrors: {
                company: ['Company is required']
              }
            }
          }
        }
      }
    } as const;
    createJobSpy.mockRejectedValue(error);

    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: /add job/i }));

    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Designer' } });

    fireEvent.click(screen.getByRole('button', { name: /create job/i }));

    await waitFor(() => expect(createJobSpy).toHaveBeenCalled());
    expect(await screen.findByText(/company is required/i)).toBeInTheDocument();
  });
});
