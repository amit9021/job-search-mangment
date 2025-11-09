import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    useContactDetailQuery: vi.fn(),
    useJobHeatExplainQuery: vi.fn()
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
const useJobHeatExplainQuery = vi.mocked(hooksModule.useJobHeatExplainQuery);

let deleteMutationSpy: ReturnType<typeof vi.fn>;
let heatRefetchSpy: ReturnType<typeof vi.fn>;

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
    heatRefetchSpy = vi.fn();

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
    } as unknown as ReturnType<typeof hooksModule.useJobsQuery>);
    useDeleteJobMutation.mockReturnValue({
      mutateAsync: deleteMutationSpy,
      isPending: false
    } as unknown as ReturnType<typeof hooksModule.useDeleteJobMutation>);
    useCreateJobMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    } as unknown as ReturnType<typeof hooksModule.useCreateJobMutation>);
    useUpdateJobMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    } as unknown as ReturnType<typeof hooksModule.useUpdateJobMutation>);
    useJobDetailQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false
    } as unknown as ReturnType<typeof hooksModule.useJobDetailQuery>);
    useJobHistoryQuery.mockReturnValue({
      data: { stage: 'APPLIED', statusHistory: [], applications: [], outreaches: [], followups: [] },
      isLoading: false,
      isFetching: false
    } as unknown as ReturnType<typeof hooksModule.useJobHistoryQuery>);
    useContactDetailQuery.mockReturnValue({
      data: null,
      isLoading: false
    } as unknown as ReturnType<typeof hooksModule.useContactDetailQuery>);
    useJobHeatExplainQuery.mockReturnValue({
      data: {
        jobId: 'job-1',
        stage: 'APPLIED',
        score: 55,
        heat: 1,
        breakdown: [],
        decayFactor: 0,
        daysSinceLastTouch: 0,
        lastTouchAt: new Date().toISOString(),
        stageBase: 40
      },
      isFetching: false,
      isError: false,
      refetch: heatRefetchSpy
    } as unknown as ReturnType<typeof hooksModule.useJobHeatExplainQuery>);
  });

  it('opens delete dialog and performs soft delete', async () => {
    renderPage();

    fireEvent.click(screen.getByTitle('Delete job'));

    expect(await screen.findByText(/delete job/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /archive job/i }));
    await waitFor(() => expect(deleteMutationSpy).toHaveBeenCalled());
    expect(deleteMutationSpy).toHaveBeenCalledWith({ id: 'job-1', hard: false });
  });

  it('performs hard delete when selected', async () => {
    renderPage();

    fireEvent.click(screen.getByTitle('Delete job'));
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
    } as unknown as ReturnType<typeof hooksModule.useJobsQuery>);

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
    } as unknown as ReturnType<typeof hooksModule.useContactDetailQuery>);

    renderPage();

    const chip = await screen.findByRole('button', { name: 'Jane Doe' });
    fireEvent.click(chip);

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
  });

  it('renders KPI header metrics based on job data', () => {
    useJobsQuery.mockReturnValue({
      data: [
        {
          id: 'job-1',
          company: 'Acme',
          role: 'Engineer',
          stage: 'APPLIED',
          heat: 3,
          updatedAt: new Date().toISOString(),
          lastTouchAt: new Date().toISOString(),
          archived: false,
          contactsCount: 2,
          contacts: [],
          nextFollowUpAt: new Date(Date.now() + 86400000).toISOString(),
          sourceUrl: null
        },
        {
          id: 'job-2',
          company: 'Dormant Co',
          role: 'Analyst',
          stage: 'REJECTED',
          heat: 0,
          updatedAt: new Date().toISOString(),
          lastTouchAt: new Date().toISOString(),
          archived: true,
          contactsCount: 0,
          contacts: [],
          nextFollowUpAt: null,
          sourceUrl: null
        }
      ],
      isLoading: false
    } as unknown as ReturnType<typeof hooksModule.useJobsQuery>);

    renderPage();

    const activeTile = screen.getByText('Active jobs').closest('article');
    expect(activeTile).toBeTruthy();
    if (activeTile) {
      expect(within(activeTile).getByText('1')).toBeInTheDocument();
    }

    const hotTile = screen.getByText('Hot jobs').closest('article');
    expect(hotTile).toBeTruthy();
    if (hotTile) {
      expect(within(hotTile).getByText('1')).toBeInTheDocument();
    }

    const avgTile = screen.getByText('Average heat').closest('article');
    expect(avgTile).toBeTruthy();
    if (avgTile) {
      expect(within(avgTile).getByText('3.0')).toBeInTheDocument();
    }
  });

  it('shows next follow-up bubble on pipeline card when scheduled', () => {
    const nextFollowUpAt = new Date(Date.now() + 86400000).toISOString();
    useJobsQuery.mockReturnValue({
      data: [
        {
          id: 'job-3',
          company: 'Bright Future',
          role: 'Growth Lead',
          stage: 'APPLIED',
          heat: 2,
          updatedAt: new Date().toISOString(),
          lastTouchAt: new Date().toISOString(),
          archived: false,
          contactsCount: 0,
          contacts: [],
          nextFollowUpAt,
          sourceUrl: null
        }
      ],
      isLoading: false
    } as unknown as ReturnType<typeof hooksModule.useJobsQuery>);

    renderPage();

    expect(screen.getByText(/Next in/i)).toBeInTheDocument();
  });
});
