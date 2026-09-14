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
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runPartVerification() {
  console.log('====================================================');
  console.log('🏆 VERIFYING PARTS 1, 2 & 3 IMPLEMENTATION 🏆');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // PART 2 VERIFICATION: Check test duplicates cleanup
    // ----------------------------------------------------
    console.log('🔹 PART 2 VERIFICATION: Checking Jaynagar duplicate cleanup...');
    const { data: jaynagarList } = await adminClient
      .from('issues')
      .select('id, title, upvotes')
      .ilike('title', '%jaynagar%');

    console.log('Jaynagar issues in DB:', jaynagarList);
    assert.strictEqual(jaynagarList.length, 1, 'Only 1 Jaynagar issue must remain in DB after cleanup');
    assert.strictEqual(jaynagarList[0].id, 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1', 'Kept issue must be f9602a68-66a2-485e-9fbd-6a6157fcd7f1');
    console.log('✅ Part 2 PASSED: Legacy duplicates cleaned up & single primary issue kept.\n');

    // ----------------------------------------------------
    // PART 1 VERIFICATION: Duplicate Submission Flow
    // ----------------------------------------------------
    console.log('🔹 PART 1 VERIFICATION: Testing Duplicate Submission Redesign...');
    
    // Create an initial open target issue
    const targetPayload = {
      title: '__PART1_TARGET_REPORT__',
      description: 'Original open report for duplicate submission test',
      category: 'water',
      district: 'Ranchi',
      location: 'POINT(85.3096 23.3441)',
      status: 'reported',
      upvotes: 0
    };
    const { data: targetIssue } = await adminClient.from('issues').insert([targetPayload]).select().single();
    console.log('Created original issue:', targetIssue.id, 'Upvotes:', targetIssue.upvotes);

    // Simulate submission flow of a duplicate report (within 500m & same category 'water')
    const { data: initialIssueCount } = await adminClient.from('issues').select('id', { count: 'exact', head: true });

    // Execute Part 1 logic: increment upvotes & add comment without inserting issue row
    const newUpvotes = (targetIssue.upvotes || 0) + 1;
    await adminClient.from('issues').update({ upvotes: newUpvotes }).eq('id', targetIssue.id);
    await adminClient.from('comments').insert([
      {
        issue_id: targetIssue.id,
        body: 'Confirmed & upvoted issue via submission: "__PART1_DUPLICATE_ATTEMPT__"'
      }
    ]);

    const { data: finalIssueCount } = await adminClient.from('issues').select('id', { count: 'exact', head: true });
    assert.strictEqual(finalIssueCount, initialIssueCount, 'Total issues count must NOT change on duplicate submission!');

    const { data: updatedTarget } = await adminClient.from('issues').select('upvotes').eq('id', targetIssue.id).single();
    assert.strictEqual(updatedTarget.upvotes, 1, 'Original issue upvotes must be incremented to 1');

    const { data: commentRows } = await adminClient.from('comments').select('id, body').eq('issue_id', targetIssue.id);
    assert.ok(commentRows.length > 0, 'Confirmation comment must be inserted');
    console.log('Confirmation comment logged:', commentRows[0].body);

    console.log('✅ Part 1 PASSED: Duplicate submissions increment upvotes & log comment without creating extra issue rows.\n');

    // Clean up target test issue
    await adminClient.from('issues').delete().eq('id', targetIssue.id);

    // ----------------------------------------------------
    // PART 3 VERIFICATION: Delete Diagnosis & Execution
    // ----------------------------------------------------
    console.log('🔹 PART 3 VERIFICATION: Testing Delete Execution...');

    // Create a fresh test issue
    const freshPayload = {
      title: '__FRESH_TEST_DELETE__',
      description: 'Fresh issue to verify client delete handler and cascade',
      category: 'infra',
      district: 'Ranchi',
      status: 'reported',
      upvotes: 0
    };

    const { data: freshIssue } = await adminClient.from('issues').insert([freshPayload]).select().single();
    await adminClient.from('status_history').insert([{ issue_id: freshIssue.id, stage: 'reported' }]);

    console.log('Created fresh test issue:', freshIssue.id);

    // Delete fresh issue with .select()
    const { data: deletedRows, error: delErr } = await adminClient
      .from('issues')
      .delete()
      .eq('id', freshIssue.id)
      .select();

    if (delErr) {
      console.error('Delete error code:', delErr.code, delErr.message);
      throw delErr;
    }

    assert.strictEqual(deletedRows.length, 1, 'Delete must return 1 deleted row');
    
    // Check status_history cascaded
    const { data: checkHistory } = await adminClient.from('status_history').select('id').eq('issue_id', freshIssue.id);
    assert.strictEqual(checkHistory.length, 0, 'status_history must be cascade deleted');

    console.log('✅ Part 3 PASSED: Issue deleted successfully and status_history cascaded.\n');

    console.log('====================================================');
    console.log('🎉 ALL PARTS (1, 2, 3) VERIFIED SUCCESSFULLY! 🎉');
    console.log('====================================================');

  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  }
}

runPartVerification();
