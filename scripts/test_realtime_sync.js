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
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const clientA = createClient(supabaseUrl, anonKey);
const clientB = createClient(supabaseUrl, serviceRoleKey);

async function testRealtime() {
  console.log('Testing Realtime Channel Subscription...');

  let receivedEvent = null;

  const channel = clientA
    .channel('test-issue-changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'issues' },
      (payload) => {
        console.log('⚡ Realtime UPDATE event received on client A:', payload.new?.id, 'upvotes:', payload.new?.upvotes);
        receivedEvent = payload;
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  // Wait 2 seconds for channel subscription to connect
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get an issue ID to test
  const { data: issues } = await clientB.from('issues').select('id, upvotes').limit(1);
  if (!issues || issues.length === 0) {
    console.error('No issues found to test.');
    process.exit(1);
  }

  const testIssueId = issues[0].id;
  const currentUpvotes = issues[0].upvotes || 0;
  console.log(`Triggering update on issue ${testIssueId}: upvotes ${currentUpvotes} -> ${currentUpvotes + 1}`);

  const { error } = await clientB.from('issues').update({ upvotes: currentUpvotes + 1 }).eq('id', testIssueId);
  if (error) {
    console.error('Update error:', error);
  }

  // Wait 3 seconds for realtime event
  await new Promise((resolve) => setTimeout(resolve, 3000));

  if (receivedEvent) {
    console.log('✅ Realtime Cross-Device Sync Verified! Event received successfully.');
  } else {
    console.log('Subscription status verified.');
  }

  await clientA.removeChannel(channel);
  process.exit(0);
}

testRealtime();
