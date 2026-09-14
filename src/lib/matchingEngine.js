import { supabase } from './supabaseClient.js';

/**
 * Triggers issue matching against qualified organizations.
 * Invokes Supabase Edge Function 'match-issue' with fallback client execution.
 *
 * @param {string} issueId - UUID of issue to match
 * @param {string} [changedByUserId] - Admin or user UUID advancing the status
 * @returns {Promise<{ matched: boolean, matches: Array, reason?: string }>}
 */
export async function matchIssue(issueId, changedByUserId) {
  if (!issueId) {
    throw new Error('Issue ID is required for matching');
  }

  // 1. Try invoking Supabase Edge Function first
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('match-issue', {
      body: { issue_id: issueId },
    });

    if (!edgeError && edgeData && edgeData.matched !== undefined) {
      console.log('⚡ Edge Function match-issue returned:', edgeData);
      return edgeData;
    }
  } catch (err) {
    console.warn('Edge Function invocation fallback:', err.message);
  }

  // 2. Client-side fallback matching algorithm
  console.log('🔄 Executing client-side matching engine fallback for issue:', issueId);

  // Fetch issue
  const { data: issue, error: issueError } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single();

  if (issueError || !issue) {
    throw new Error('Issue not found for matching');
  }

  // Fetch candidate orgs in district
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .eq('district', issue.district);

  if (orgsError) throw orgsError;

  // Filter orgs with matching category tag
  const candidateOrgs = (orgs || []).filter((org) => {
    const tags = org.category_tags || [];
    return tags.includes(issue.category);
  });

  if (candidateOrgs.length === 0) {
    return {
      matched: false,
      matches: [],
      reason: `No matching organizations found in ${issue.district} for category '${issue.category}'`,
    };
  }

  const roleBuckets = {
    university: ['university', 'research_institution'],
    industry: ['csr', 'startup', 'msme'],
    govt: ['govt'],
  };

  const matchesToCreate = [];
  const getTagCount = (org) => (org.category_tags || []).length;

  for (const [roleName, allowedTypes] of Object.entries(roleBuckets)) {
    const bucketOrgs = candidateOrgs.filter((org) => allowedTypes.includes(org.type));
    if (bucketOrgs.length > 0) {
      bucketOrgs.sort((a, b) => getTagCount(b) - getTagCount(a));
      const selectedOrg = bucketOrgs[0];

      matchesToCreate.push({
        issue_id: issue.id,
        org_id: selectedOrg.id,
        role: roleName,
      });
    }
  }

  if (matchesToCreate.length === 0) {
    return {
      matched: false,
      matches: [],
      reason: 'No qualifying organizations found in role buckets',
    };
  }

  // Insert matches
  const { data: createdMatches, error: matchInsertError } = await supabase
    .from('matches')
    .insert(matchesToCreate)
    .select('*, organizations(*)');

  if (matchInsertError) throw matchInsertError;

  // Update issue status to 'matched' and insert status_history
  const actorId = changedByUserId || issue.reporter_id || '22222222-2222-4222-a222-222222222201';

  await supabase.from('issues').update({ status: 'matched' }).eq('id', issue.id);

  await supabase.from('status_history').insert([
    {
      issue_id: issue.id,
      stage: 'matched',
      outcome_type: 'pilot_test',
      changed_by: actorId,
    },
  ]);

  return {
    matched: true,
    matches: createdMatches,
    issue_id: issue.id,
  };
}
