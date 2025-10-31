import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LinkJobDialog } from '../LinkJobDialog';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useJobSearchQuery: vi.fn(),
    useCreateJobMutation: vi.fn(),
    useCreateJobOutreachMutation: vi.fn()
  };
});

import * as hooks from '../../api/hooks';

const useJobSearchQuery = vi.mocked(hooks.useJobSearchQuery);
const useCreateJobMutation = vi.mocked(hooks.useCreateJobMutation);
const useCreateJobOutreachMutation = vi.mocked(hooks.useCreateJobOutreachMutation);

describe('LinkJobDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useJobSearchQuery.mockReturnValue({ data: [], isFetching: false });
    useCreateJobMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useCreateJobOutreachMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('creates a new job inline and logs outreach', async () => {
    const createJobSpy = vi.fn().mockResolvedValue({
      id: 'job_created',
      company: 'Initrode',
      role: 'AE',
      stage: 'APPLIED',
      heat: 0,
      contactsCount: 0
    });
    const createOutreachSpy = vi.fn().mockResolvedValue({
      outreach: { id: 'outreach_new', contactId: 'contact_77' },
      job: { id: 'job_created', contactsCount: 1 }
    });

    useCreateJobMutation.mockReturnValue({ mutateAsync: createJobSpy, isPending: false });
    useCreateJobOutreachMutation.mockReturnValue({ mutateAsync: createOutreachSpy, isPending: false });

    render(
      <LinkJobDialog
        contact={{ id: 'contact_77', name: 'Alicia', companyName: 'Initrode' }}
        open
        onOpenChange={() => {}}
        defaultTab="new"
      />
    );

    await waitFor(() => expect(document.querySelector('input[name="company"]')).toBeTruthy());
    const companyInput = document.querySelector('input[name="company"]') as HTMLInputElement;
    const roleInput = document.querySelector('input[name="role"]') as HTMLInputElement;
    const sourceInput = document.querySelector('input[name="sourceUrl"]') as HTMLInputElement;

    fireEvent.change(companyInput, { target: { value: 'Initrode' } });
    fireEvent.change(roleInput, { target: { value: 'AE' } });
    fireEvent.change(sourceInput, { target: { value: 'https://jobs.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /use this job/i }));

    await waitFor(() => expect(screen.getByText(/linking job/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /link job/i }));

    await waitFor(() => {
      expect(createJobSpy).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Initrode', role: 'AE', sourceUrl: 'https://jobs.example.com' })
      );
      expect(createOutreachSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job_created',
          contactId: 'contact_77',
          channel: 'LINKEDIN',
          context: 'JOB_OPPORTUNITY'
        })
      );
    });
  });
});
