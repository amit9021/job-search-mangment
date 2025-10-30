import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../api/hooks', () => ({
  useKpiTodayQuery: () => ({
    data: {
      cvSentToday: 3,
      cvTarget: 5,
      outreachToday: 4,
      outreachTarget: 5,
      followupsDue: 2,
      seniorReviewsThisWeek: 1,
      heatBreakdown: [
        { heat: 0, count: 1 },
        { heat: 1, count: 2 }
      ]
    }
  }),
  useKpiWeekQuery: () => ({
    data: {
      cvSent: 12,
      outreach: 15,
      followupsSent: 6,
      eventsAttended: 1,
      boostTasksDone: 2
    }
  }),
  useFollowupsQuery: () => ({ data: [] }),
  useNotificationsQuery: () => ({ data: [] })
}));

describe('DashboardPage', () => {
  it('renders KPI counts from API', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Tailored CVs')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('Outreach')).toBeInTheDocument();
  });
});
