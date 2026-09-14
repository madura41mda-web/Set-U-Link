import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function diagnoseSeverityFlow() {
  console.log('====================================================');
  console.log('🔍 DIAGNOSING SEVERITY RATING PERSISTENCE & RLS 🔍');
  console.log('====================================================\n');

  // Fetch a test issue
  const { data: issues } = await adminClient.from('issues').select('id, reporter_id, avg_severity_score').limit(1);
  if (!issues || issues.length === 0) {
    console.log('No issues found');
    return;
  }

  const issueId = issues[0].id;
  console.log(`📌 Test Issue ID: ${issueId}, Current avg_severity_score: ${issues[0].avg_severity_score}`);

  // Fetch a test user (different from reporter)
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const testUser = usersData.users.find((u) => u.id !== issues[0].reporter_id);

  if (!testUser) {
    console.log('No test user found');
    return;
  }

  console.log(`👤 Test Voter User ID: ${testUser.id} (${testUser.email})`);

  // Step A: Test severity_votes upsert using adminClient
  console.log('\n--- Step A: Testing severity_votes UPSERT ---');
  const { data: upsertData, error: upsertErr } = await adminClient
    .from('severity_votes')
    .upsert({ issue_id: issueId, voter_id: testUser.id, score: 4 }, { onConflict: 'issue_id, voter_id' })
    .select();

  console.log('severity_votes UPSERT result:', { upsertData, upsertErr: upsertErr?.message });

  // Step B: Test reading all votes for issue
  console.log('\n--- Step B: Testing severity_votes SELECT ---');
  const { data: allVotes, error: selectErr } = await anonClient
    .from('severity_votes')
    .select('score')
    .eq('issue_id', issueId);

  console.log('severity_votes SELECT result:', { voteCount: allVotes?.length, selectErr: selectErr?.message });

  // Step C: Test updating issues.avg_severity_score using anonClient (representing citizen session)
  console.log('\n--- Step C: Testing issues.update({ avg_severity_score }) via anonClient ---');
  const { data: updateDataAnon, error: updateErrAnon } = await anonClient
    .from('issues')
    .update({ avg_severity_score: 4.0 })
    .eq('id', issueId)
    .select();

  console.log('issues UPDATE via anonClient result:', {
    returnedRows: updateDataAnon?.length || 0,
    updateErrAnon: updateErrAnon?.message || 'None (silent 0 rows updated due to RLS)'
  });

  // Step D: Test updating issues.avg_severity_score using adminClient (service role)
  console.log('\n--- Step D: Testing issues.update({ avg_severity_score }) via adminClient ---');
  const { data: updateDataAdmin, error: updateErrAdmin } = await adminClient
    .from('issues')
    .update({ avg_severity_score: 4.0 })
    .eq('id', issueId)
    .select();

  console.log('issues UPDATE via adminClient result:', {
    returnedRows: updateDataAdmin?.length || 0,
    updateErrAdmin: updateErrAdmin?.message
  });
}

diagnoseSeverityFlow();
