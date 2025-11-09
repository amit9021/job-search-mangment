import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkJobDialog } from '../LinkJobDialog';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useJobSearchQuery: vi.fn(),
    useCreateJobMutation: vi.fn()
  };
});

import * as hooks from '../../api/hooks';

const useJobSearchQuery = vi.mocked(hooks.useJobSearchQuery);
const useCreateJobMutation = vi.mocked(hooks.useCreateJobMutation);

describe('LinkJobDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useJobSearchQuery.mockReturnValue({
      data: [],
      isFetching: false
    } as unknown as ReturnType<typeof hooks.useJobSearchQuery>);
    useCreateJobMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    } as unknown as ReturnType<typeof hooks.useCreateJobMutation>);
  });

  it('creates a new job inline and emits linked job payload', async () => {
    const createJobSpy = vi.fn().mockResolvedValue({
      id: 'job_created',
      company: 'Initrode',
      role: 'AE',
      stage: 'APPLIED',
      heat: 0,
      contactsCount: 0
    });

    useCreateJobMutation.mockReturnValue({
      mutateAsync: createJobSpy,
      isPending: false
    } as unknown as ReturnType<typeof hooks.useCreateJobMutation>);
    const onLinked = vi.fn();

    render(
      <LinkJobDialog
        contact={{ id: 'contact_77', name: 'Alicia', companyName: 'Initrode' }}
        open
        onOpenChange={() => {}}
        defaultTab="new"
        onLinked={onLinked}
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

    await waitFor(() => expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(createJobSpy).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Initrode', role: 'AE', sourceUrl: 'https://jobs.example.com' })
      );
      expect(onLinked).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job_created',
          company: 'Initrode',
          role: 'AE',
          stage: 'APPLIED'
        })
      );
    });
  });
});
