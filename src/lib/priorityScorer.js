const HIGH_SEVERITY_KEYWORDS = [
  'collapsed',
  'emergency',
  'fatal',
  'hazard',
  'contaminated',
  'epidemic',
  'fire',
  'danger',
  'burst',
  'flood',
  'casualty',
  'outbreak',
  'paralyzed',
  'severe',
];

const MODERATE_SEVERITY_KEYWORDS = [
  'urgent',
  'broken',
  'overflowing',
  'leak',
  'damage',
  'no water',
  'outage',
  'critical',
  'blocked',
  'disrupted',
];

/**
 * Calculates priority score for an issue based on upvotes, recency, severity keywords, and submitter role.
 */
export function calculatePriorityScore({
  upvotes = 0,
  created_at = new Date(),
  title = '',
  description = '',
  submitter_type = 'citizen',
}) {
  let score = 50; // Base score

  // 1. Upvotes weighting (10 pts per upvote)
  score += Math.max(0, upvotes) * 10;

  // 2. Submitter type bonus (+25 pts for official Panchayats / ULBs)
  if (submitter_type === 'panchayat' || submitter_type === 'ulb') {
    score += 25;
  }

  // 3. Recency decay (up to +30 pts for newer issues)
  const createdDate = new Date(created_at);
  const diffDays = Math.max(0, (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const recencyBonus = Math.max(0, 30 - Math.floor(diffDays * 2));
  score += recencyBonus;

  // 4. Keyword severity bump
  const text = `${title} ${description}`.toLowerCase();

  let keywordScore = 0;
  if (HIGH_SEVERITY_KEYWORDS.some((kw) => text.includes(kw))) {
    keywordScore = 30;
  } else if (MODERATE_SEVERITY_KEYWORDS.some((kw) => text.includes(kw))) {
    keywordScore = 15;
  }

  score += keywordScore;

  return Math.round(score * 10) / 10;
}
