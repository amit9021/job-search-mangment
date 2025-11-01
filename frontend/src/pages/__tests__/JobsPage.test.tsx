import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { JobsPage } from '../JobsPage';
import { ToastProvider } from '../../components/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useJobsQuery: vi.fn(),
    useDeleteJobMutation: vi.fn(),
    useCreateJobMutation: vi.fn(),
    useUpdateJobMutation: vi.fn(),
    useJobDetailQuery: vi.fn(),
    useJobHistoryQuery: vi.fn(),
    useContactDetailQuery: vi.fn()
  };
});

import * as hooksModule from '../../api/hooks';

const useJobsQuery = vi.mocked(hooksModule.useJobsQuery);
const useDeleteJobMutation = vi.mocked(hooksModule.useDeleteJobMutation);
const useCreateJobMutation = vi.mocked(hooksModule.useCreateJobMutation);
const useUpdateJobMutation = vi.mocked(hooksModule.useUpdateJobMutation);
const useJobDetailQuery = vi.mocked(hooksModule.useJobDetailQuery);
const useJobHistoryQuery = vi.mocked(hooksModule.useJobHistoryQuery);
const useContactDetailQuery = vi.mocked(hooksModule.useContactDetailQuery);

let deleteMutationSpy: ReturnType<typeof vi.fn>;

const renderPage = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <JobsPage />
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('JobsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    deleteMutationSpy = vi.fn().mockResolvedValue({});

    useJobsQuery.mockReturnValue({
      data: [
        {
          id: 'job-1',
          company: 'Acme',
          role: 'Engineer',
          stage: 'APPLIED',
          heat: 1,
          updatedAt: new Date().toISOString(),
          lastTouchAt: new Date().toISOString(),
          archived: false,
          contactsCount: 0,
          contacts: [],
          nextFollowUpAt: null,
          sourceUrl: null
        }
      ],
      isLoading: false
    });
    useDeleteJobMutation.mockReturnValue({ mutateAsync: deleteMutationSpy, isPending: false });
    useCreateJobMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useUpdateJobMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useJobDetailQuery.mockReturnValue({ data: null });
    useJobHistoryQuery.mockReturnValue({ data: { stage: 'APPLIED', statusHistory: [], applications: [], outreaches: [], followups: [] }, isLoading: false });
    useContactDetailQuery.mockReturnValue({ data: null, isLoading: false });
  });

  it('opens delete dialog and performs soft delete', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Del' }));

    expect(await screen.findByText(/delete job/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /archive job/i }));
    await waitFor(() => expect(deleteMutationSpy).toHaveBeenCalled());
    expect(deleteMutationSpy).toHaveBeenCalledWith({ id: 'job-1', hard: false });
  });

  it('performs hard delete when selected', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Del' }));
    fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
    await waitFor(() => expect(deleteMutationSpy).toHaveBeenCalled());
    expect(deleteMutationSpy).toHaveBeenLastCalledWith({ id: 'job-1', hard: true });
  });

  it('renders linked contacts and opens drawer when chip clicked', async () => {
    useJobsQuery.mockReturnValue({
      data: [
        {
          id: 'job-2',
          company: 'Globex',
          role: 'Product Manager',
          stage: 'APPLIED',
          heat: 2,
          updatedAt: new Date().toISOString(),
          lastTouchAt: new Date().toISOString(),
          archived: false,
          contactsCount: 1,
          contacts: [{ id: 'contact-1', name: 'Jane Doe', role: 'Recruiter' }],
          nextFollowUpAt: null,
          sourceUrl: null
        }
      ],
      isLoading: false
    });

    useContactDetailQuery.mockReturnValue({
      data: {
        id: 'contact-1',
        name: 'Jane Doe',
        company: null,
        role: 'Recruiter',
        email: null,
        phone: null,
        linkedinUrl: null,
        githubUrl: null,
        location: null,
        tags: [],
        notes: null,
        strength: 'WEAK',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [],
        linkedJobs: []
      },
      isLoading: false
    });

    renderPage();

    const chip = await screen.findByRole('button', { name: 'Jane Doe' });
    fireEvent.click(chip);

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
  });
});
