import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobHistoryModal } from '../JobHistoryModal';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useJobHistoryQuery: vi.fn(),
    useUpdateOutreachMutation: vi.fn(),
    useDeleteOutreachMutation: vi.fn(),
    useUpdateJobStageMutation: vi.fn()
  };
});

import * as hooksModule from '../../api/hooks';

const useJobHistoryQuery = vi.mocked(hooksModule.useJobHistoryQuery);
const useUpdateOutreachMutation = vi.mocked(hooksModule.useUpdateOutreachMutation);
const useDeleteOutreachMutation = vi.mocked(hooksModule.useDeleteOutreachMutation);
const useUpdateJobStageMutation = vi.mocked(hooksModule.useUpdateJobStageMutation);

let updateOutreachSpy: ReturnType<typeof vi.fn>;

describe('JobHistoryModal', () => {
  const outreachDate = '2025-01-10T10:00:00.000Z';
  const followUpDate = '2025-01-11T09:30:00.000Z';

  beforeEach(() => {
    vi.resetAllMocks();

    updateOutreachSpy = vi.fn().mockResolvedValue({});
    useUpdateOutreachMutation.mockReturnValue({ mutateAsync: updateOutreachSpy, isPending: false });
    useDeleteOutreachMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useUpdateJobStageMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });

    useJobHistoryQuery.mockReturnValue({
      data: {
        company: 'Acme',
        role: 'Engineer',
        stage: 'APPLIED',
        statusHistory: [
          { id: 'status-1', at: '2025-01-09T12:00:00.000Z', stage: 'HR', note: 'Recruiter screen scheduled' }
        ],
        applications: [
          { id: 'app-1', dateSent: '2025-01-08T18:00:00.000Z', tailoringScore: 85, cvVersionId: 'v2' }
        ],
        outreaches: [
          {
            id: 'out-1',
            sentAt: outreachDate,
            channel: 'EMAIL',
            outcome: 'NONE',
            personalizationScore: 70,
            messageType: 'INTRO',
            content: 'Reached out about the open role.',
            context: 'JOB_OPPORTUNITY',
            contact: { id: 'contact-1', name: 'Jane Rivera' }
          }
        ],
        followups: [
          {
            id: 'follow-1',
            dueAt: followUpDate,
            attemptNo: 1,
            sentAt: null,
            note: 'Send a reminder email',
            contact: { id: 'contact-1', name: 'Jane Rivera' }
          }
        ]
      },
      isLoading: false
    });
  });

  it('groups entries by day and updates outreach outcomes inline', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <JobHistoryModal jobId="job-1" open onOpenChange={() => {}} />
      </QueryClientProvider>
    );

    const headerLabel = format(new Date(outreachDate), 'EEEE, MMM d');
    expect(await screen.findByText(headerLabel)).toBeInTheDocument();
    expect(screen.getByText(/Outreach via EMAIL/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Jane Rivera' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Follow-up attempt 1/)).toBeInTheDocument();

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'POSITIVE' } });

    await waitFor(() => {
      expect(updateOutreachSpy).toHaveBeenCalledWith({ id: 'out-1', outcome: 'POSITIVE' });
    });
  });
});
