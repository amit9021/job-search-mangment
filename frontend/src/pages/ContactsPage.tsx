import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

import { useSearchParams } from 'react-router-dom';
import { useContactsQuery, useNetworkStarsQuery } from '../api/hooks';
import { StrengthBadge } from '../components/StrengthBadge';
import { ContactDrawer } from '../components/ContactDrawer';
import { ContactEngagementBadge } from '../components/ContactEngagementBadge';

const strengthOptions = [
  { label: 'Any strength', value: '' },
  { label: 'Weak', value: 'WEAK' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Strong', value: 'STRONG' }
];

const lastTouchOptions = [
  { label: 'Any time', value: 'any' as const },
  { label: 'Last 7 days', value: '7d' as const },
  { label: 'Last 30 days', value: '30d' as const },
  { label: 'Stale (>30 days)', value: 'stale' as const },
  { label: 'No outreach yet', value: 'never' as const }
];

type TagOption = { label: string; count: number };

const TagFilterControl = ({
  options,
  selected,
  onToggle,
  onClear
}: {
  options: TagOption[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}) => {
  const selectionLabel =
    selected.length > 0
      ? `${selected.length} selected`
      : options.length === 0
      ? 'No tags yet'
      : 'All tags';

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-haspopup="true"
          aria-label="Filter contacts by tags"
        >
          <span className="flex items-center gap-2">
            <span>Choose tags</span>
            <span className="text-xs font-normal text-slate-400">{selectionLabel}</span>
          </span>
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.708a.75.75 0 111.06 1.062l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.061z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl focus:outline-none"
        >
          <div className="max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <p className="px-1 py-2 text-sm text-slate-500">
                Add tags to your contacts to unlock tag filters.
              </p>
            ) : (
              options.map(({ label, count }) => {
                const checked = selected.includes(label);
                return (
                  <label
                    key={label}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={checked}
                      onChange={() => onToggle(label)}
                    />
                    <span className="flex-1 truncate" title={label}>
                      {label}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{count}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="mt-3 flex justify-between gap-2">
            <button
              type="button"
              onClick={onClear}
              disabled={selected.length === 0}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
            <Popover.Close asChild>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Done
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const formatLastTouch = (dateString?: string | null) => {
  if (!dateString) {
    return '—';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;
  if (diffDays >= 7 && diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatNextFollowUp = (dateString?: string | null) => {
  if (!dateString) {
    return '—';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Due';
  if (diffDays === 1) return 'In 1 day';
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const ContactsPage = () => {
  const [strengthFilter, setStrengthFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lastTouchFilter, setLastTouchFilter] = useState<'any' | '7d' | '30d' | 'stale' | 'never'>('any');
  const [searchInput, setSearchInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [strength, setStrength] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit');

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      query: searchQuery || undefined,
      strength: strengthFilter || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      lastTouch: lastTouchFilter !== 'any' ? lastTouchFilter : undefined
    }),
    [searchQuery, strengthFilter, selectedTags, lastTouchFilter]
  );

  const { data: contacts } = useContactsQuery(filters);
  const { data: stars } = useNetworkStarsQuery();

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    (contacts ?? []).forEach((contact) => {
      (contact.tags ?? []).forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }))
      .slice(0, 25);
  }, [contacts]);

  const hasActiveFilters =
    Boolean(strengthFilter) || selectedTags.length > 0 || lastTouchFilter !== 'any';
  const hasSearch = searchQuery.length > 0;

  const handleRowClick = (contactId: string) => {
    setDrawerMode('edit');
    setSelectedContactId(contactId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedContactId(null);
      setDrawerMode('edit');
    }, 300);
  };

  const handleQuickAdd = () => {
    setDrawerMode('create');
    setSelectedContactId(null);
    setDrawerOpen(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]));
  };
  useEffect(() => {
    const focusId = searchParams.get('focus');
    if (!focusId || !contacts) {
      return;
    }
    const exists = contacts.some((contact) => contact.id === focusId);
    if (exists) {
      setDrawerMode('edit');
      setSelectedContactId(focusId);
      setDrawerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, contacts, setSearchParams]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const addTagFilter = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  };

  const clearFilters = () => {
    setStrengthFilter('');
    setSelectedTags([]);
    setLastTouchFilter('any');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Networking bench</h2>
          <p className="text-sm text-slate-500">
            Track conversions, nurture warm supporters, and keep momentum with consistent outreach.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex min-w-[220px] flex-1">
          <label htmlFor="contacts-search" className="sr-only">
            Search contacts
          </label>
          <input
            id="contacts-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search contacts by name, email, role, or LinkedIn..."
            className="w-full rounded-lg border border-slate-200 px-4 py-2 pl-10 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          type="button"
          onClick={handleQuickAdd}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        >
          <span className="text-lg leading-none">＋</span>
          Quick add
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-[160px] flex-col gap-1">
            <label
              htmlFor="contacts-strength-filter"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Strength
            </label>
            <select
              id="contacts-strength-filter"
              value={strengthFilter}
              onChange={(event) => setStrengthFilter(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {strengthOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[160px] flex-col gap-1">
            <label
              htmlFor="contacts-last-touch-filter"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Last touch
            </label>
            <select
              id="contacts-last-touch-filter"
              value={lastTouchFilter}
              onChange={(event) => setLastTouchFilter(event.target.value as typeof lastTouchFilter)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {lastTouchOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tags
            </span>
            <TagFilterControl
              options={tagOptions}
              selected={selectedTags}
              onToggle={toggleTag}
              onClear={() => setSelectedTags([])}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </span>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-200"
              >
                {tag}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Jobs</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Engagement</th>
              <th className="px-4 py-3 text-left">Strength</th>
              <th className="px-4 py-3 text-left">Last Touch</th>
              <th className="px-4 py-3 text-left">Next Follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(contacts ?? []).map((contact) => (
              <tr
                key={contact.id}
                onClick={() => handleRowClick(contact.id)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  {contact.name}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addTagFilter(tag);
                          }}
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {tag}
                        </button>
                      ))}
                      {contact.tags.length > 2 && (
                        <span className="text-xs text-slate-400">
                          +{contact.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {contact.company ? (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {contact.company.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{contact.role ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {contact.linkedJobs && contact.linkedJobs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {contact.linkedJobs.slice(0, 3).map((job) => (
                        <span
                          key={job.id}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
                        >
                          <span className="font-medium">{job.company}</span>
                          {job.role ? <span className="text-blue-500">— {job.role}</span> : null}
                        </span>
                      ))}
                      {contact.linkedJobs.length > 3 && (
                        <span className="text-[11px] text-slate-400">
                          +{contact.linkedJobs.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(event) => event.stopPropagation()}
                      className="text-blue-600 hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{contact.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <ContactEngagementBadge
                    engagement={contact.engagement}
                    lastTouchAt={contact.lastTouchAt}
                    nextFollowUpAt={contact.nextFollowUpAt}
                    strength={contact.strength}
                  />
                </td>
                <td className="px-4 py-3">
                  <StrengthBadge strength={contact.strength} />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {formatLastTouch(contact.lastTouchAt)}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {formatNextFollowUp(contact.nextFollowUpAt)}
                </td>
              </tr>
            ))}
            {(contacts ?? []).length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">
                  {hasSearch || hasActiveFilters
                    ? 'No contacts match the current filters.'
                    : 'No contacts yet. Time to expand your warm map.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-700">Network stars</h3>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm text-amber-800">
          {(stars ?? []).map((star) => (
            <li key={star.id} className="rounded-full bg-white px-4 py-2 shadow">
              {star.name} · {typeof star.company === 'string' ? star.company : 'Independent'} (
              {star.referrals.length} conversions)
            </li>
          ))}
          {(stars ?? []).length === 0 && <li>No historical conversions yet.</li>}
        </ul>
      </section>

      <ContactDrawer
        contactId={selectedContactId}
        mode={drawerMode}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onCreated={(created) => {
          setDrawerMode('edit');
          setSelectedContactId(created.id);
        }}
      />
    </div>
  );
};
