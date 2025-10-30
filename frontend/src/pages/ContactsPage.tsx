import { useState } from 'react';
import { useContactsQuery, useNetworkStarsQuery } from '../api/hooks';
import { StrengthBadge } from '../components/StrengthBadge';
import { ContactDrawer } from '../components/ContactDrawer';

const filters = [
  { label: 'All', value: undefined },
  { label: 'Weak', value: 'WEAK' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Strong', value: 'STRONG' }
];

export const ContactsPage = () => {
  const [strength, setStrength] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: contacts } = useContactsQuery({
    query: searchQuery || undefined,
    strength
  });
  const { data: stars } = useNetworkStarsQuery();

  const handleRowClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedContactId(null), 300); // Wait for animation
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Networking bench</h2>
          <p className="text-sm text-slate-500">Track conversions and nudge warm supporters.</p>
        </div>
        <div className="flex gap-2">
          {filters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStrength(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                strength === filter.value
                  ? 'bg-brand text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-brand/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by name, email, role, or LinkedIn..."
            className="w-full px-4 py-2 pl-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Strength</th>
              <th className="px-4 py-3 text-left">Last Touch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(contacts ?? []).map((contact) => (
              <tr
                key={contact.id}
                onClick={() => handleRowClick(contact.id)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  {contact.name}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {contact.tags.slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                        >
                          {tag}
                        </span>
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {contact.company.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{contact.role ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(e) => e.stopPropagation()}
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
                  <StrengthBadge strength={contact.strength} />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {formatDate(contact.lastTouchAt)}
                </td>
              </tr>
            ))}
            {(contacts ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  {searchQuery
                    ? 'No contacts found matching your search.'
                    : 'No contacts for this filter yet. Time to expand your warm map.'}
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
              {star.name} · {typeof star.company === 'string' ? star.company : 'Independent'} ({star.referrals.length} conversions)
            </li>
          ))}
          {(stars ?? []).length === 0 && <li>No historical conversions yet.</li>}
        </ul>
      </section>

      {/* Contact Drawer */}
      <ContactDrawer
        contactId={selectedContactId}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};
