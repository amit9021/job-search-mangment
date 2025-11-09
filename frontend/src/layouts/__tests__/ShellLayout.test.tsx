import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellLayout } from '../ShellLayout';
import { useSessionStore } from '../../stores/session';

vi.mock('../../api/hooks', () => ({
  useNextActionQuery: () => ({ data: { title: 'Call Beta HR', action: 'Confirm technical interview slot' } })
}));

describe('ShellLayout', () => {
  beforeEach(() => {
    useSessionStore.setState({ token: 'test', user: { id: '1', username: 'admin' } } as any);
  });

  it('renders next best action data from API hook', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ShellLayout />}>
            <Route index element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Next Best Action')).toBeInTheDocument();
    expect(screen.getByText('Call Beta HR')).toBeInTheDocument();
  });
});
