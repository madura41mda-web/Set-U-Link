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

async function verifySeverityTrigger() {
  console.log('====================================================');
  console.log('🧪 VERIFYING SEVERITY TRIGGER & PERSISTENCE 🧪');
  console.log('====================================================\n');

  // Fetch a test issue
  const { data: initialIssue, error: fetchErr } = await adminClient
    .from('issues')
    .select('id, title, avg_severity_score, reporter_id')
    .limit(1)
    .single();

  if (fetchErr || !initialIssue) {
    console.error('Failed to fetch test issue:', fetchErr);
    return;
  }

  const beforeScore = initialIssue.avg_severity_score;
  console.log(`📊 BEFORE Vote: Issue "${initialIssue.title}" (ID: ${initialIssue.id.slice(0, 8)}) avg_severity_score = ${beforeScore}`);

  // Fetch a test user ID different from reporter
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const testUser = usersData.users.find((u) => u.id !== initialIssue.reporter_id);

  if (!testUser) {
    console.error('No test user found');
    return;
  }

  // Insert/upsert a vote (e.g. score = 5) into severity_votes
  const { data: voteData, error: voteErr } = await adminClient
    .from('severity_votes')
    .upsert({ issue_id: initialIssue.id, voter_id: testUser.id, score: 5 }, { onConflict: 'issue_id, voter_id' })
    .select();

  if (voteErr) {
    console.error('Failed to upsert vote:', voteErr);
    return;
  }
  console.log(`  ✅ Upserted severity_vote (score = 5) for user ${testUser.email.slice(0, 10)}...`);

  // Refetch issue from database via anonClient (simulating frontend query/refresh)
  const { data: afterIssue, error: refetchErr } = await anonClient
    .from('issues')
    .select('id, title, avg_severity_score')
    .eq('id', initialIssue.id)
    .single();

  if (refetchErr) {
    console.error('Failed to refetch issue:', refetchErr);
    return;
  }

  const afterScore = afterIssue.avg_severity_score;
  console.log(`📊 AFTER Vote: Issue "${afterIssue.title}" avg_severity_score = ${afterScore}`);

  console.log('\n====================================================');
  console.log(`Summary: Before Score: ${beforeScore} | After Score: ${afterScore}`);
  console.log('====================================================');
}

verifySeverityTrigger();
