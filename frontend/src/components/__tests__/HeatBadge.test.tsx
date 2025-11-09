import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeatBadge } from '../HeatBadge';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useJobHeatExplainQuery: vi.fn()
  };
});

import * as hooksModule from '../../api/hooks';

const useJobHeatExplainQuery = vi.mocked(hooksModule.useJobHeatExplainQuery);

describe('HeatBadge', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches heat breakdown on open and renders details', async () => {
    const refetchSpy = vi.fn();
    useJobHeatExplainQuery.mockReturnValue({
      data: {
        jobId: 'job-1',
        stage: 'APPLIED',
        score: 75,
        heat: 2,
        breakdown: [
          { category: 'stage', label: 'Stage base', value: 12, maxValue: 20 },
          { category: 'decay', label: 'Recency', value: -4, maxValue: -20, note: '7 days since touch' }
        ],
        decayFactor: 0.8,
        daysSinceLastTouch: 3,
        lastTouchAt: new Date().toISOString(),
        stageBase: 40
      },
      isFetching: false,
      isError: false,
      refetch: refetchSpy
    } as unknown as ReturnType<typeof hooksModule.useJobHeatExplainQuery>);

    render(<HeatBadge heat={2} jobId="job-1" />);

    fireEvent.click(screen.getByRole('button', { name: /view heat breakdown/i }));

    await waitFor(() => expect(refetchSpy).toHaveBeenCalled());
    expect(await screen.findByText(/Stage base/)).toBeInTheDocument();
    expect(screen.getByText(/Recency decay/)).toBeInTheDocument();
  });

  it('shows loading state while fetching breakdown', async () => {
    useJobHeatExplainQuery.mockReturnValue({
      data: undefined,
      isFetching: true,
      isError: false,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof hooksModule.useJobHeatExplainQuery>);

    render(<HeatBadge heat={1} jobId="job-2" />);

    fireEvent.click(screen.getByRole('button', { name: /view heat breakdown/i }));

    expect(await screen.findByText(/Updating breakdown…/)).toBeInTheDocument();
  });
});
