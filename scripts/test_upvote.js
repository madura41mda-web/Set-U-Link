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

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function testUpvote() {
  const { data: issues } = await adminClient.from('issues').select('id, upvotes').limit(1);
  if (!issues || issues.length === 0) {
    console.log('No issues found');
    return;
  }

  const issue = issues[0];
  console.log('Testing upvote on issue:', issue.id, 'Current upvotes:', issue.upvotes);

  // Test RPC
  const { data: rpcData, error: rpcError } = await adminClient.rpc('increment_upvote', { p_issue_id: issue.id });
  console.log('RPC increment_upvote result:', { rpcData, rpcError: rpcError?.message });

  // Test direct update
  if (rpcError) {
    console.log('RPC failed, trying direct update fallback...');
    const { data: updateData, error: updateError } = await adminClient
      .from('issues')
      .update({ upvotes: (issue.upvotes || 0) + 1 })
      .eq('id', issue.id)
      .select();

    console.log('Direct update result:', { updateData, updateError: updateError?.message });
  }
}

testUpvote();
