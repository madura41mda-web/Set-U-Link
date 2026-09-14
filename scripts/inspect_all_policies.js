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

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function inspectAllPolicies() {
  console.log('=== INSPECTING ALL POLICIES VIA SERVICE ROLE ===\n');

  // Check if we can list policies from pg_catalog via rpc or check database policies
  // Let's create an rpc to query pg_policies
  const createRpcSql = `
    CREATE OR REPLACE FUNCTION public.get_pg_policies()
    RETURNS TABLE (
      schemaname text,
      tablename text,
      policyname text,
      roles name[],
      cmd text,
      qual text,
      with_check text
    ) AS $$
      SELECT schemaname::text, tablename::text, policyname::text, roles, cmd::text, qual::text, with_check::text
      FROM pg_policies
      WHERE tablename = 'issues';
    $$ LANGUAGE sql SECURITY DEFINER;
  `;

  // Try calling postgres function or check schema
  const { data: testFunc, error: rpcErr } = await adminClient.rpc('get_pg_policies');
  if (rpcErr) {
    console.log('RPC get_pg_policies error:', rpcErr.message);
  } else {
    console.log('Policies on issues table:', testFunc);
  }
}

inspectAllPolicies();
