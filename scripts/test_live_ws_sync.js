import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
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

// Client A simulates Browser Window A (Citizen / Feed view)
const clientA = createClient(supabaseUrl, anonKey, {
  realtime: { WebSocket: WebSocket },
});

// Client B simulates Browser Window B (Another device / User B)
const clientB = createClient(supabaseUrl, serviceRoleKey, {
  realtime: { WebSocket: WebSocket },
});

async function testWsSync() {
  console.log('Connecting Client A (Simulated Window A - Listener)...');

  let payloadReceived = null;

  const channelA = clientA
    .channel('issue-feed-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'issues' },
      (payload) => {
        console.log('⚡ [Window A received Realtime Event]:', payload.eventType, 'Issue ID:', payload.new?.id || payload.old?.id, 'Upvotes:', payload.new?.upvotes, 'Status:', payload.new?.status);
        payloadReceived = payload;
      }
    )
    .subscribe((status) => {
      console.log('[Window A Subscription Status]:', status);
    });

  // Wait 2.5 seconds for Window A to fully subscribe to Supabase Realtime WS
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Get a target issue
  const { data: issues } = await clientB.from('issues').select('id, upvotes, status').limit(1);
  if (!issues || issues.length === 0) {
    console.log('No issues found in DB.');
    process.exit(1);
  }

  const targetIssue = issues[0];
  console.log(`\nSimulating action in Window B: Incrementing upvotes on Issue ${targetIssue.id} (Current: ${targetIssue.upvotes || 0})`);

  // Window B performs upvote update
  const newUpvoteCount = (targetIssue.upvotes || 0) + 1;
  const { error: updateErr } = await clientB
    .from('issues')
    .update({ upvotes: newUpvoteCount })
    .eq('id', targetIssue.id);

  if (updateErr) {
    console.error('Window B update error:', updateErr);
  } else {
    console.log('Window B update committed to database.');
  }

  // Wait 3 seconds to capture Realtime WS broadcast in Window A
  await new Promise((resolve) => setTimeout(resolve, 3000));

  if (payloadReceived) {
    console.log('\n✅ REALTIME CROSS-DEVICE SYNC SUCCESSFUL!');
    console.log('Event payload details:', {
      table: payloadReceived.table,
      eventType: payloadReceived.eventType,
      newUpvotes: payloadReceived.new?.upvotes,
    });
  } else {
    console.log('\n⚠️ Realtime channel connected, but no WS payload received in 3s window.');
  }

  await clientA.removeChannel(channelA);
  process.exit(0);
}

testWsSync();
