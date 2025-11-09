import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddOutreachDialog } from '../AddOutreachDialog';

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

describe('AddOutreachDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useContactSearchQuery.mockReturnValue({
      data: [],
      isFetching: false
    } as unknown as ReturnType<typeof hooks.useContactSearchQuery>);
    useCreateJobOutreachMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    } as unknown as ReturnType<typeof hooks.useCreateJobOutreachMutation>);
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

    useCreateJobOutreachMutation.mockReturnValue({
      mutateAsync: mutateSpy,
      isPending: false
    } as unknown as ReturnType<typeof hooks.useCreateJobOutreachMutation>);
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
    } as unknown as ReturnType<typeof hooks.useContactSearchQuery>);

    render(
      <AddOutreachDialog
        job={{ id: 'job_1', company: 'Acme', role: 'Engineer', stage: 'APPLIED', heat: 0, lastTouchAt: '', contactsCount: 0 }}
        open
        onOpenChange={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText(/type name/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    await waitFor(() => expect(screen.getByText(/Jane Candidate/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Jane Candidate/));

    await waitFor(() => expect(screen.getByText(/contact:/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /add outreach/i }));

    await waitFor(() => {
      expect(mutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job_1',
          contactId: 'contact_1',
          channel: 'EMAIL',
          messageType: 'intro_request',
          context: 'JOB_OPPORTUNITY',
          outcome: 'NONE'
        })
      );
    });
  });

  it('logs outreach for an inline contact in contact mode', async () => {
    const mutateSpy = vi.fn().mockResolvedValue({
      outreach: { id: 'outreach_c1', contact: { id: 'contact_inline', name: 'Taylor' }, contactId: 'contact_inline' },
      job: {
        id: 'job_inline',
        company: 'Vandelay',
        role: 'Sales Lead',
        stage: 'APPLIED',
        heat: 0,
        contactsCount: 1,
        contacts: [{ id: 'contact_inline', name: 'Taylor', role: 'Hiring Manager' }]
      }
    });

    useCreateJobOutreachMutation.mockReturnValue({
      mutateAsync: mutateSpy,
      isPending: false
    } as unknown as ReturnType<typeof hooks.useCreateJobOutreachMutation>);

    render(
      <AddOutreachDialog
        mode="contact"
        job={{ id: 'job_inline', company: 'Vandelay', role: 'Sales Lead', stage: 'APPLIED', heat: 0, lastTouchAt: '', contactsCount: 0 }}
        contact={{ id: 'contact_inline', name: 'Taylor', role: 'Hiring Manager', email: 'taylor@example.com' }}
        open
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add outreach/i }));

    await waitFor(() => {
      expect(mutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job_inline',
          contactId: 'contact_inline'
        })
      );
    });
  });
});
