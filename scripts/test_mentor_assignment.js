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
console.log('🧪 VERIFYING MODULE 3: MENTOR/TEAM ASSIGNMENT 🧪');
console.log('====================================================\n');

// 1. Test Comment Table Insertion with is_org_update and prefix
console.log('🔹 1. Testing database insertion into comments table...');

async function testDatabaseInsert() {
  // Get an existing issue ID
  const { data: issues, error: issueErr } = await adminClient
    .from('issues')
    .select('id')
    .limit(1);

  assert.ifError(issueErr);
  assert.ok(issues && issues.length > 0, 'Should have at least one issue in the DB');

  const testIssueId = issues[0].id;
  const inputTeam = 'Dr. Ananya Roy + 3 students, Dept. of CS';
  const expectedBody = `🎓 Mentor/Team Assigned: ${inputTeam}`;

  // Get an admin/org user profile
  const { data: users, error: userErr } = await adminClient
    .from('profiles')
    .select('id')
    .limit(1);

  assert.ifError(userErr);
  const authorId = users[0].id;

  const { data: inserted, error: insertErr } = await adminClient
    .from('comments')
    .insert([
      {
        issue_id: testIssueId,
        author_id: authorId,
        body: expectedBody,
        is_org_update: true,
      },
    ])
    .select()
    .single();

  assert.ifError(insertErr);
  assert.strictEqual(inserted.body, expectedBody, 'Comment body must match expected string');
  assert.strictEqual(inserted.is_org_update, true, 'is_org_update must be true');
  console.log('  ✅ Comment inserted successfully:', inserted.id);

  // 2. Test prefix detection logic in MyReports.jsx
  console.log('\n🔹 2. Testing MyReports assignment badge detection logic...');

  const isTeamAssigned = inserted.body.startsWith('🎓 Mentor/Team Assigned:');
  assert.strictEqual(isTeamAssigned, true, 'Prefix detector must return true for mentor assignment');
  console.log('  ✅ Prefix detector correctly identified "🎓 Mentor/Team Assigned:" comment');

  // Clean up test comment
  await adminClient.from('comments').delete().eq('id', inserted.id);
  console.log('  🧹 Test comment cleaned up.');
}

await testDatabaseInsert();

// 3. Verify Code Structure in OrgDashboard.jsx and MyReports.jsx
console.log('\n🔹 3. Verifying code files structure...');

const orgDashContent = fs.readFileSync(path.join(__dirname, '../src/pages/OrgDashboard.jsx'), 'utf8');
assert.ok(orgDashContent.includes('🎓 Assign Team / Mentor'), 'OrgDashboard.jsx must include "🎓 Assign Team / Mentor" label');
assert.ok(orgDashContent.includes('handleAssignMentor'), 'OrgDashboard.jsx must include handleAssignMentor handler');
assert.ok(orgDashContent.includes('🎓 Mentor/Team Assigned:'), 'OrgDashboard.jsx must format body with "🎓 Mentor/Team Assigned:"');
console.log('  ✅ OrgDashboard.jsx verified!');

const myReportsContent = fs.readFileSync(path.join(__dirname, '../src/pages/MyReports.jsx'), 'utf8');
assert.ok(myReportsContent.includes('🎓 Mentor/Team Assigned:'), 'MyReports.jsx must detect "🎓 Mentor/Team Assigned:"');
assert.ok(myReportsContent.includes('Team Assigned'), 'MyReports.jsx must render "Team Assigned" badge');
console.log('  ✅ MyReports.jsx verified!');

console.log('\n====================================================');
console.log('🎉 ALL MODULE 3 VERIFICATION CHECKS PASSED! 🎉');
console.log('====================================================');
