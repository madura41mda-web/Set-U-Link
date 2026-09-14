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

async function diagnoseRealtime() {
  console.log('--- Part 3: Diagnosing Realtime & RLS from Database ---');

  // 1. Check pg_publication_tables for 'supabase_realtime'
  console.log('\n=== 1. Checking pg_publication_tables for supabase_realtime ===');
  // We can query pg_publication_tables via REST RPC or query if allowed
  // Let's check via a custom query or select
  try {
    const { data: pubTables, error: pubErr } = await adminClient
      .rpc('exec_sql', { sql_string: "select * from pg_publication_tables where pubname = 'supabase_realtime';" });

    if (pubErr) {
      console.log('exec_sql not available, testing direct query via RPC if exists or checking tables...');
    } else {
      console.log('Publication tables in supabase_realtime:', pubTables);
    }
  } catch (err) {
    console.log('Publication tables check notice:', err.message);
  }

  // 2. Inspect RLS Policies on issues, severity_votes, matches, comments
  console.log('\n=== 2. Testing anon / authenticated SELECT access on issues & severity_votes ===');
  const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];
  const userClient = createClient(supabaseUrl, anonKey);

  const { data: issuesAnon, error: issuesErr } = await userClient
    .from('issues')
    .select('id, title, upvotes, avg_severity_score')
    .limit(5);

  console.log('Anon client SELECT issues result:', {
    count: issuesAnon?.length,
    error: issuesErr?.message,
  });

  const { data: votesAnon, error: votesErr } = await userClient
    .from('severity_votes')
    .select('*')
    .limit(5);

  console.log('Anon client SELECT severity_votes result:', {
    count: votesAnon?.length,
    error: votesErr?.message,
  });

  // 3. Test what happens when an issue is updated via userClient vs adminClient
  console.log('\n=== 3. Testing Realtime Channel Connection & Event Delivery ===');
  let eventReceived = false;

  const channel = userClient
    .channel('test-realtime-diag')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'issues' },
      (payload) => {
        console.log('⚡ Realtime event received on anon channel:', payload.eventType, payload.new?.id);
        eventReceived = true;
      }
    )
    .subscribe((status, err) => {
      console.log('Channel subscription status:', status, err ? err.message : '');
    });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Perform an update on issues table using adminClient
  if (issuesAnon && issuesAnon.length > 0) {
    const targetId = issuesAnon[0].id;
    console.log(`Updating issue ${targetId} via adminClient...`);
    const { error: updateErr } = await adminClient
      .from('issues')
      .update({ upvotes: (issuesAnon[0].upvotes || 0) + 1 })
      .eq('id', targetId);

    console.log('Update result:', { error: updateErr?.message });
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log(`Realtime Event Received: ${eventReceived ? 'YES ✅' : 'NO ❌'}`);

  await userClient.removeChannel(channel);
}

diagnoseRealtime();
