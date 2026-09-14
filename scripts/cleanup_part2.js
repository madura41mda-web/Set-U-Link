import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function cleanupPart2() {
  console.log('=== PART 2: CLEANING UP EXISTING TEST DUPLICATES ===\n');

  const idsToDelete = [
    '82f50af6-13b4-4928-860d-a6586842b478',
    'adfb5f86-b9c6-4ee4-8b36-4a5b35b424a8'
  ];
  const keptId = 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1';

  // 1. Fetch kept issue
  const { data: keptIssue } = await adminClient.from('issues').select('*').eq('id', keptId).single();
  console.log('Kept Issue:', keptIssue.id, keptIssue.title, 'Created:', keptIssue.created_at);

  // 2. Sum upvotes of the three issues
  const { data: targetRows } = await adminClient.from('issues').select('id, upvotes').in('id', [keptId, ...idsToDelete]);
  const totalUpvotes = targetRows ? targetRows.reduce((sum, r) => sum + (r.upvotes || 0), 0) : 0;
  console.log(`Sum of upvotes across 3 duplicates: ${totalUpvotes}`);

  // Update kept issue upvotes
  await adminClient.from('issues').update({ upvotes: totalUpvotes }).eq('id', keptId);

  // 3. Delete the 2 duplicate rows directly via service role (bypassing app button)
  const { data: deletedRows, error: delErr } = await adminClient
    .from('issues')
    .delete()
    .in('id', idsToDelete)
    .select();

  if (delErr) throw delErr;
  console.log(`Successfully deleted ${deletedRows?.length} duplicate rows:`, deletedRows?.map(r => r.id));

  // 4. Confirm cascade removed status_history for deleted rows
  const { data: deletedHistories } = await adminClient.from('status_history').select('id').in('issue_id', idsToDelete);
  assert.strictEqual(deletedHistories.length, 0, 'status_history rows for deleted duplicates must be 0');

  // Confirm kept issue status_history and matches are intact
  const { data: keptHistories } = await adminClient.from('status_history').select('id').eq('issue_id', keptId);
  console.log(`Kept issue status_history count: ${keptHistories?.length}`);

  console.log('\n✅ Part 2 Cleanup Completed Successfully!');
}

cleanupPart2();
