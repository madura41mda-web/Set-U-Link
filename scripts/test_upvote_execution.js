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

const client = createClient(supabaseUrl, anonKey);

async function verifyUpvoteLogic() {
  console.log('====================================================');
  console.log('🧪 VERIFYING UPVOTE INCREMENTATION & PERSISTENCE 🧪');
  console.log('====================================================\n');

  // 1. Fetch initial issue upvotes
  const { data: initialIssues, error: fetchErr } = await client
    .from('issues')
    .select('id, title, upvotes')
    .limit(1);

  if (fetchErr || !initialIssues || initialIssues.length === 0) {
    console.error('Failed to fetch initial issue:', fetchErr);
    return;
  }

  const issue = initialIssues[0];
  const initialUpvotes = issue.upvotes || 0;
  console.log(`📊 Initial State: Issue "${issue.title}" (ID: ${issue.id.slice(0, 8)}) has ${initialUpvotes} upvotes.`);

  // 2. Perform upvote (simulating handleUpvote logic)
  const newCount = initialUpvotes + 1;
  const { error: rpcErr } = await client.rpc('increment_upvote', { p_issue_id: issue.id });

  if (rpcErr) {
    console.log('  ⚠️ RPC increment_upvote returned error (expected if SQL function not deployed yet):', rpcErr.message);
    console.log('  🔄 Executing direct update fallback...');
    const { error: updateErr } = await client
      .from('issues')
      .update({ upvotes: newCount })
      .eq('id', issue.id);

    if (updateErr) {
      console.error('  ❌ Direct update fallback error:', updateErr);
      return;
    }
    console.log('  ✅ Direct update fallback executed successfully!');
  } else {
    console.log('  ✅ RPC increment_upvote executed successfully!');
  }

  // 3. Re-query from database to confirm persistence after update/refetch
  const { data: updatedIssues, error: refetchErr } = await client
    .from('issues')
    .select('id, title, upvotes')
    .eq('id', issue.id)
    .single();

  if (refetchErr) {
    console.error('Failed to refetch issue:', refetchErr);
    return;
  }

  const finalUpvotes = updatedIssues.upvotes;
  console.log(`📊 Refetched State: Upvote count in DB is now ${finalUpvotes}.`);

  if (finalUpvotes === initialUpvotes + 1) {
    console.log('\n====================================================');
    console.log('🎉 STEP 1 VERIFICATION PASSED: Upvotes incremented and persisted!');
    console.log('====================================================');
  } else {
    console.error(`❌ Mismatch: Expected ${initialUpvotes + 1}, got ${finalUpvotes}`);
  }
}

verifyUpvoteLogic();
