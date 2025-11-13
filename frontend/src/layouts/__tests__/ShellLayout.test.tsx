import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ShellLayout } from '../ShellLayout';

vi.mock('../../api/hooks', () => ({
  useNextActionQuery: () => ({ data: { title: 'Call Beta HR', action: 'Confirm technical interview slot' } })
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@example.com', createdAt: new Date().toISOString() },
    logout: vi.fn(),
    logoutStatus: 'idle',
    isAuthenticated: true,
    isLoading: false,
    token: 'token'
  })
}));

describe('ShellLayout', () => {
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
