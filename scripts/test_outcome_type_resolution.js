import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

const adminClient = createClient(supabaseUrl, serviceRoleKey);

console.log('====================================================');
console.log('🧪 VERIFYING MODULE 5: OUTCOME_TYPE RESOLUTION FIX 🧪');
console.log('====================================================\n');

// 1. Test database insertion for all 4 allowed outcome_type values
console.log('🔹 1. Testing database insertion for all 4 outcome_types into status_history...');

const allowedOutcomes = ['deployed_solution', 'research_output', 'pilot_test', 'policy_change'];

async function testDatabaseOutcomes() {
  const { data: issues, error: issueErr } = await adminClient
    .from('issues')
    .select('id')
    .limit(1);

  assert.ifError(issueErr);
  assert.ok(issues && issues.length > 0, 'Should have at least one issue in DB');
  const testIssueId = issues[0].id;

  const { data: users, error: userErr } = await adminClient
    .from('profiles')
    .select('id')
    .limit(1);

  assert.ifError(userErr);
  const testUser = users[0].id;

  for (const outcome of allowedOutcomes) {
    const { data: inserted, error } = await adminClient
      .from('status_history')
      .insert([
        {
          issue_id: testIssueId,
          stage: 'resolved',
          outcome_type: outcome,
          changed_by: testUser,
        },
      ])
      .select()
      .single();

    assert.ifError(error, `Failed to insert outcome_type: ${outcome}`);
    assert.strictEqual(inserted.outcome_type, outcome, `Inserted outcome_type must be ${outcome}`);
    console.log(`  ✅ Successfully inserted status_history with outcome_type: '${outcome}' (ID: ${inserted.id.slice(0, 8)})`);

    // Clean up inserted test history row
    await adminClient.from('status_history').delete().eq('id', inserted.id);
  }
}

await testDatabaseOutcomes();

// 2. Verify code structure in OrgDashboard.jsx and MyReports.jsx
console.log('\n🔹 2. Verifying code files structure...');

const orgDashContent = fs.readFileSync(path.join(__dirname, '../src/pages/OrgDashboard.jsx'), 'utf8');
assert.ok(orgDashContent.includes('OUTCOME_TYPES'), 'OrgDashboard.jsx must define OUTCOME_TYPES');
assert.ok(orgDashContent.includes('outcomeTypes'), 'OrgDashboard.jsx must manage outcomeTypes state');
assert.ok(orgDashContent.includes('deployed_solution'), 'OrgDashboard.jsx must support deployed_solution');
assert.ok(orgDashContent.includes('research_output'), 'OrgDashboard.jsx must support research_output');
assert.ok(orgDashContent.includes('policy_change'), 'OrgDashboard.jsx must support policy_change');
console.log('  ✅ OrgDashboard.jsx verified!');

const myReportsContent = fs.readFileSync(path.join(__dirname, '../src/pages/MyReports.jsx'), 'utf8');
assert.ok(myReportsContent.includes('OUTCOME_TYPES'), 'MyReports.jsx must define OUTCOME_TYPES');
assert.ok(myReportsContent.includes('outcomeTypes'), 'MyReports.jsx must manage outcomeTypes state');
assert.ok(myReportsContent.includes('deployed_solution'), 'MyReports.jsx must support deployed_solution');
assert.ok(myReportsContent.includes('research_output'), 'MyReports.jsx must support research_output');
assert.ok(myReportsContent.includes('policy_change'), 'MyReports.jsx must support policy_change');
console.log('  ✅ MyReports.jsx verified!');

console.log('\n====================================================');
console.log('🎉 ALL MODULE 5 VERIFICATION CHECKS PASSED! 🎉');
console.log('====================================================');
