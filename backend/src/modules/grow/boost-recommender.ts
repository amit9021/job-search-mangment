type BoostCategory = 'skills-gap' | 'visibility-gap' | 'network-gap';

export type BoostSuggestion = {
  title: string;
  description?: string;
  category: BoostCategory;
  impactLevel: number;
  tags?: string[];
};

export type BoostActivityStats = {
  outreach7d: number;
  eventsAttended30d: number;
  boostsCompleted30d: number;
  highlightsPublished30d: number;
};

type ExistingTask = {
  title: string;
  category: string;
};

export function suggestBoostTasks(
  userStack: string[],
  marketTrends: string[],
  activityStats: BoostActivityStats,
  existingTasks: ExistingTask[] = []
): BoostSuggestion[] {
  const suggestions: BoostSuggestion[] = [];
  const normalizedExistingTitles = new Set(existingTasks.map((task) => task.title.toLowerCase()));
  const normalizedStack = new Set(userStack.map((tech) => tech.toLowerCase()));

  for (const trend of marketTrends) {
    const normalizedTrend = trend.toLowerCase();
    if (!normalizedStack.has(normalizedTrend)) {
      suggestions.push({
        title: `Prototype with ${trend}`,
        description: `Pick a weekend project and add ${trend} to your toolkit. Document learnings and share with the team.`,
        category: 'skills-gap',
        impactLevel: 4,
        tags: [normalizedTrend]
      });
    }
  }

  if (activityStats.outreach7d < 3) {
    suggestions.push({
      title: 'Reach out to 3 new senior engineers',
      description:
        'Share a recent project update and ask for a quick 15-minute sync or async feedback.',
      category: 'network-gap',
      impactLevel: 3,
      tags: ['networking', 'mentors']
    });
  }

  if (activityStats.eventsAttended30d < 1) {
    suggestions.push({
      title: 'Register for a live meetup or webinar',
      description:
        'Pick an event aligned with desired roles and commit to at least one new connection.',
      category: 'network-gap',
      impactLevel: 4,
      tags: ['events', 'exposure']
    });
  }

  if (activityStats.highlightsPublished30d < 1) {
    suggestions.push({
      title: 'Publish a project highlight post',
      description:
        'Summarize a recent project win with before/after metrics and publish on LinkedIn.',
      category: 'visibility-gap',
      impactLevel: 4,
      tags: ['brand', 'linkedin']
    });
  }

  if (activityStats.boostsCompleted30d < 2) {
    suggestions.push({
      title: 'Ship a micro-optimisation write-up',
      description:
        'Identify a small product or infrastructure improvement, ship it, and write a short teardown.',
      category: 'visibility-gap',
      impactLevel: 5,
      tags: ['storytelling', 'impact']
    });
  }

  const filtered = suggestions.filter(
    (suggestion) => !normalizedExistingTitles.has(suggestion.title.toLowerCase())
  );
  const deduped: BoostSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of filtered) {
    const key = `${suggestion.category}:${suggestion.title.toLowerCase()}`;
    if (!seen.has(key)) {
      deduped.push(suggestion);
      seen.add(key);
    }
  }

  return deduped.slice(0, 5);
}
