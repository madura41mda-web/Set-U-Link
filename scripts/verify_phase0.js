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

console.log('--- PHASE 0 DB VERIFICATION TEST SUITE ---');
const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runPhase0Test() {
  try {
    // Step 1: Create Primary Test Report
    const primaryPayload = {
      title: '__PHASE0_TEST_PRIMARY__',
      description: 'Primary test report for duplicate cluster deletion verification',
      category: 'water',
      district: 'Ranchi',
      status: 'reported',
      upvotes: 2,
      created_at: new Date(Date.now() - 10000).toISOString()
    };
    const { data: primary, error: err1 } = await adminClient.from('issues').insert([primaryPayload]).select().single();
    if (err1) throw err1;
    console.log('1. Created primary issue:', primary.id);

    // Add status history entry to verify CASCADE
    await adminClient.from('status_history').insert([{ issue_id: primary.id, stage: 'reported' }]);

    // Step 2: Create Child Duplicate 1 (older duplicate)
    const child1Payload = {
      title: '__PHASE0_TEST_CHILD_1__',
      description: 'First child duplicate report',
      category: 'water',
      district: 'Ranchi',
      status: 'reported',
      duplicate_of: primary.id,
      created_at: new Date(Date.now() - 5000).toISOString()
    };
    const { data: child1, error: err2 } = await adminClient.from('issues').insert([child1Payload]).select().single();
    if (err2) throw err2;
    console.log('2. Created child duplicate 1:', child1.id);

    // Step 3: Create Child Duplicate 2 (newer duplicate)
    const child2Payload = {
      title: '__PHASE0_TEST_CHILD_2__',
      description: 'Second child duplicate report',
      category: 'water',
      district: 'Ranchi',
      status: 'reported',
      duplicate_of: primary.id,
      created_at: new Date().toISOString()
    };
    const { data: child2, error: err3 } = await adminClient.from('issues').insert([child2Payload]).select().single();
    if (err3) throw err3;
    console.log('3. Created child duplicate 2:', child2.id);

    // Step 4: Execute Phase 0 deletion logic on Primary
    console.log('4. Executing Phase 0 child duplicate reassignment & deletion...');

    const { data: dbChildDuplicates } = await adminClient
      .from('issues')
      .select('id, created_at')
      .eq('duplicate_of', primary.id)
      .order('created_at', { ascending: true });

    assert.strictEqual(dbChildDuplicates.length, 2, 'Should find 2 child duplicates linked to primary');

    const newPrimary = dbChildDuplicates[0];
    // Reassign new primary duplicate_of to null
    await adminClient.from('issues').update({ duplicate_of: null }).eq('id', newPrimary.id);

    // Reassign rest to point to new primary
    for (let i = 1; i < dbChildDuplicates.length; i++) {
      await adminClient.from('issues').update({ duplicate_of: newPrimary.id }).eq('id', dbChildDuplicates[i].id);
    }

    // Delete primary issue with .select()
    const { data: deletedRows, error: deleteErr } = await adminClient
      .from('issues')
      .delete()
      .eq('id', primary.id)
      .select();

    if (deleteErr) throw deleteErr;
    assert.strictEqual(deletedRows.length, 1, 'Primary row must be returned in deleted rows');

    // Step 5: Verify directly in DB
    console.log('5. Verifying DB state after deletion...');

    // Check primary is gone
    const { data: fetchPrimary } = await adminClient.from('issues').select('id').eq('id', primary.id);
    assert.strictEqual(fetchPrimary.length, 0, 'Primary issue must be completely removed from DB');

    // Check status_history cascaded
    const { data: fetchHistory } = await adminClient.from('status_history').select('id').eq('issue_id', primary.id);
    assert.strictEqual(fetchHistory.length, 0, 'status_history rows for primary must cascade delete');

    // Check child1 reassigned (new primary)
    const { data: fetchChild1 } = await adminClient.from('issues').select('id, duplicate_of').eq('id', child1.id).single();
    assert.strictEqual(fetchChild1.duplicate_of, null, 'Child 1 (oldest) should now have duplicate_of = null');

    // Check child2 reassigned to child1
    const { data: fetchChild2 } = await adminClient.from('issues').select('id, duplicate_of').eq('id', child2.id).single();
    assert.strictEqual(fetchChild2.duplicate_of, child1.id, 'Child 2 should now point to Child 1');

    console.log('✅ Phase 0 DB Verification PASSED! Re-assignments and Cascade Deletes verified in real database.');

    // Cleanup remaining test rows
    await adminClient.from('issues').delete().eq('id', child2.id);
    await adminClient.from('issues').delete().eq('id', child1.id);
    console.log('Cleaned up test rows.');

  } catch (err) {
    console.error('Phase 0 Verification Failed:', err);
    process.exit(1);
  }
}

runPhase0Test();
