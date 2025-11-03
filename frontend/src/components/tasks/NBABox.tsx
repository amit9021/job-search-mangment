const suggestions = [
  {
    title: 'Hot jobs without follow-up',
    description: '2 opportunities warmed up last week but no outreach recorded.'
  },
  {
    title: 'Strong contacts idle >14 days',
    description: 'Schedule a light-touch ping to stay on their radar.'
  },
  {
    title: 'Boost backlog',
    description: 'Pick one project and ship a visible upgrade this week.'
  }
];

export const NBABox = () => (
  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
        🔍
      </div>
      <div>
        <h3 className="text-sm font-semibold text-indigo-800">Next best actions</h3>
        <p className="mt-1 text-xs text-indigo-600">System nudges based on recent activity.</p>
        <ul className="mt-3 space-y-2 text-sm text-indigo-700">
          {suggestions.map((item) => (
            <li key={item.title} className="rounded-lg border border-indigo-100 bg-white/60 px-3 py-2">
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs text-indigo-500">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);
