import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

console.log('Supabase URL:', supabaseUrl);
console.log('Testing raw DB delete via Service Role Key...');

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function testDelete() {
  try {
    const { data: issues, error: fetchErr } = await adminClient.from('issues').select('id, title, status, reporter_id, duplicate_of').limit(5);
    if (fetchErr) {
      console.error('Fetch error:', fetchErr);
      return;
    }
    console.log('Fetched sample issues:', issues);

    const testPayload = {
      title: '__TEST_DELETE_ISSUE__',
      description: 'Temporary issue for Phase 0 delete verification',
      category: 'water',
      district: 'Ranchi',
      status: 'reported',
      priority_score: 50
    };

    const { data: created, error: createErr } = await adminClient.from('issues').insert([testPayload]).select().single();
    if (createErr) {
      console.error('Failed to create test issue:', createErr);
      return;
    }

    console.log('Created test issue:', created.id, created.title, created.status);

    // Test deleting as postgres service role (bypassing RLS)
    const { data: deletedData, error: deleteErr } = await adminClient
      .from('issues')
      .delete()
      .eq('id', created.id)
      .select();

    if (deleteErr) {
      console.error('Service Role Delete FAILED (FK constraint issue!):', deleteErr);
    } else {
      console.log('Service Role Delete SUCCESS! Deleted rows count:', deletedData?.length, deletedData);
    }

    // Test anon client delete without session
    const { data: created2 } = await adminClient.from('issues').insert([testPayload]).select().single();
    if (created2) {
      console.log('Created second test issue:', created2.id);
      const { data: anonDeleted, error: anonErr } = await anonClient
        .from('issues')
        .delete()
        .eq('id', created2.id)
        .select();

      console.log('Anon Delete Result -> Error:', anonErr, 'Data (0 means RLS block):', anonDeleted);

      // Clean up second issue with admin client
      await adminClient.from('issues').delete().eq('id', created2.id);
    }

  } catch (err) {
    console.error('Exception in testDelete:', err);
  }
}

testDelete();
