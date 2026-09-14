import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { issue_id } = await req.json();

    if (!issue_id) {
      return new Response(
        JSON.stringify({ matched: false, reason: 'Missing issue_id in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch target issue
    const { data: issue, error: issueError } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issue_id)
      .single();

    if (issueError || !issue) {
      return new Response(
        JSON.stringify({ matched: false, reason: 'Issue not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Fetch candidate organizations in district with matching category tag
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('district', issue.district);

    if (orgsError) throw orgsError;

    // Filter orgs where category_tags array contains the issue's category
    const candidateOrgs = (orgs || []).filter((org) => {
      const tags = org.category_tags || [];
      return tags.includes(issue.category);
    });

    if (candidateOrgs.length === 0) {
      return new Response(
        JSON.stringify({
          matched: false,
          reason: `No matching organizations found in ${issue.district} for category '${issue.category}'`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Role bucket mapping
    const roleBuckets = {
      university: ['university', 'research_institution'],
      industry: ['csr', 'startup', 'msme'],
      govt: ['govt'],
    };

    const matchesToCreate = [];

    // Score function based on tag overlaps
    const getTagCount = (org) => (org.category_tags || []).length;

    for (const [roleName, allowedTypes] of Object.entries(roleBuckets)) {
      const bucketOrgs = candidateOrgs.filter((org) => allowedTypes.includes(org.type));
      if (bucketOrgs.length > 0) {
        // Pick org with highest tag overlap score
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
      return new Response(
        JSON.stringify({ matched: false, reason: 'No qualifying organizations found in role buckets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Insert matches into database
    const { data: createdMatches, error: matchInsertError } = await supabase
      .from('matches')
      .insert(matchesToCreate)
      .select('*, organizations(*)');

    if (matchInsertError) throw matchInsertError;

    // 4. Update issue status to 'matched' & log status_history
    const adminSystemId = '22222222-2222-4222-a222-222222222201';

    await supabase.from('issues').update({ status: 'matched' }).eq('id', issue.id);

    await supabase.from('status_history').insert([
      {
        issue_id: issue.id,
        stage: 'matched',
        outcome_type: 'pilot_test',
        changed_by: issue.reporter_id || adminSystemId,
      },
    ]);

    return new Response(
      JSON.stringify({
        matched: true,
        matches: createdMatches,
        issue_id: issue.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ matched: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
