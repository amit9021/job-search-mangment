import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LinkContactDialog } from '../LinkContactDialog';

vi.mock('../../api/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../api/hooks')>('../../api/hooks');
  return {
    ...actual,
    useContactSearchQuery: vi.fn(),
    useCreateJobOutreachMutation: vi.fn()
  };
});

import * as hooks from '../../api/hooks';

const useContactSearchQuery = vi.mocked(hooks.useContactSearchQuery);
const useCreateJobOutreachMutation = vi.mocked(hooks.useCreateJobOutreachMutation);

describe('LinkContactDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useContactSearchQuery.mockReturnValue({ data: [], isFetching: false });
    useCreateJobOutreachMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('selects an existing contact and submits outreach payload', async () => {
    const mutateSpy = vi.fn().mockResolvedValue({
      outreach: { id: 'outreach_1', contact: { id: 'contact_1', name: 'Jane' }, contactId: 'contact_1' },
      job: {
        id: 'job_1',
        company: 'Acme',
        role: 'Engineer',
        stage: 'APPLIED',
        heat: 1,
        lastTouchAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        contactsCount: 1,
        contacts: [{ id: 'contact_1', name: 'Jane', role: 'Recruiter' }]
      }
    });

    useCreateJobOutreachMutation.mockReturnValue({ mutateAsync: mutateSpy, isPending: false });
    useContactSearchQuery.mockReturnValue({
      data: [
        {
          id: 'contact_1',
          name: 'Jane Candidate',
          role: 'Recruiter',
          company: { id: 'comp_1', name: 'Globex' }
        }
      ],
      isFetching: false
    });

    vi.useFakeTimers();

    render(
      <LinkContactDialog
        job={{ id: 'job_1', company: 'Acme', role: 'Engineer', stage: 'APPLIED', heat: 0, lastTouchAt: '', contactsCount: 0 }}
        open
        onOpenChange={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText(/type name/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    vi.advanceTimersByTime(300);
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByText(/Jane Candidate/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Jane Candidate/));

    await waitFor(() => expect(screen.getByText(/linking to/i)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /link contact/i }));
    });

    await waitFor(() => {
      expect(mutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job_1',
          contactId: 'contact_1',
          channel: 'EMAIL',
          messageType: 'intro_request',
          context: 'JOB_OPPORTUNITY'
        })
      );
    });
  });
});
