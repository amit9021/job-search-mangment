import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';

const mockRefetch = vi.fn();

vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    LineChart: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Bar: Stub,
    Line: Stub,
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub
  };
});

vi.mock('../../api/useDashboard', () => ({
  useDashboardSummary: () => ({
    data: {
      summary: {
        kpis: {
          tailoredCvs: { sentToday: 2, targetDaily: 5, spark: [1, 2, 3] },
          outreach: { sentToday: 3, targetDaily: 5, spark: [0, 1, 2] },
          followUpsDue: 4,
          seniorReviewsThisWeek: 1
        },
        nextBestAction: {
          title: 'Follow up with Acme',
          reason: 'High-heat role without a follow-up scheduled in the next 48 hours.',
          suggestedAction: 'follow_up',
          job: { id: 'job-1', company: 'Acme', role: 'Senior Engineer', heat: 3 },
          ctaLink: '/jobs?focus=job-1&followups=today&view=table&followupId=f1'
        },
        todayQueue: [
          {
            type: 'follow_up',
            title: 'Follow up with Jane Doe',
            dueAt: new Date().toISOString(),
            ctaLink: '/jobs?focus=job-1&followups=today&view=table&followupId=f1'
          }
        ],
        notifications: [
          { severity: 'high', text: '2 follow-ups are overdue.', ctaLink: '/jobs?view=table&followups=overdue' }
        ]
      },
      meta: { cache: 'miss', degraded: false }
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch
  })
}));

vi.mock('../../api/useStats', () => ({
  useWeeklySummary: () => ({
    data: {
      range: 7,
      series: {
        cvsSent: [
          { d: '2025-11-01', v: 1 },
          { d: '2025-11-02', v: 2 }
        ],
        warmOutreach: [
          { d: '2025-11-01', v: 0 },
          { d: '2025-11-02', v: 1 }
        ],
        followupsDone: [{ d: '2025-11-01', v: 1 }],
        followupsDue: [{ d: '2025-11-01', v: 2 }]
      },
      heat: {
        h0: 1,
        h1: 2,
        h2: 0,
        h3: 1,
        delta: { h0: 0, h1: 1, h2: -1, h3: 0 }
      },
      degraded: false
    },
    isLoading: false,
    isFetching: false
  })
}));

const noopAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('../../api/hooks', () => ({
  useKpiTodayQuery: () => ({ data: undefined }),
  useKpiWeekQuery: () => ({ data: undefined }),
  useFollowupsQuery: () => ({ data: [] }),
  useNotificationsQuery: () => ({ data: [] }),
  useTaskUpdateMutation: () => ({ mutateAsync: noopAsync, isPending: false }),
  useTaskSnoozeMutation: () => ({ mutateAsync: noopAsync, isPending: false }),
  useMarkFollowupMutation: () => ({ mutateAsync: noopAsync, isPending: false })
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DASHBOARD_V1', 'true');
  });

  it('renders dashboard summary when feature flag enabled', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Next best action/i)).toBeInTheDocument();
    expect(screen.getByText(/Follow up with Acme/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tailored CVs/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Range/i)).toBeInTheDocument();
    expect(screen.getByText(/Follow-ups & heat/i)).toBeInTheDocument();
  });
});
