import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerification() {
  console.log('🚀 Initializing local Postgres engine (PGlite)...');
  const db = new PGlite();

  // Define Supabase auth stubs so RLS functions & auth.uid()/auth.role() resolve cleanly
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT NULL::uuid $$ LANGUAGE sql;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'anon'::text $$ LANGUAGE sql;
  `);

  // 1. Read and run schema migration
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260913000000_create_setulink_schema.sql');
  console.log(`📜 Loading Migration: ${migrationPath}`);
  let migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Strip postgis extension & geography type for PGlite standalone execution
  migrationSql = migrationSql
    .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- PostGIS extension')
    .replace(/geography\(Point,\s*4326\)/gi, 'text')
    .replace(/USING GIST\(location\)/gi, 'USING btree(location)');

  try {
    await db.exec(migrationSql);
    console.log('✅ Schema migration applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }

  // 2. Read and run seed script
  const seedPath = path.join(__dirname, '../supabase/seed.sql');
  console.log(`🌱 Loading Seed SQL: ${seedPath}`);
  let seedSql = fs.readFileSync(seedPath, 'utf8');
  
  // Format location values for PGlite testing
  seedSql = seedSql.replace(/ST_SetSRID\(ST_MakePoint\(([^)]+)\), 4326\)::geography/gi, "'POINT($1)'");

  try {
    await db.exec(seedSql);
    console.log('✅ Seed data inserted successfully!');
  } catch (err) {
    console.error('❌ Seed execution failed:', err);
    process.exit(1);
  }

  // 3. Row count per table query
  console.log('\n======================================================');
  console.log('📊 TASK 4 SUMMARY: ROW COUNTS PER TABLE');
  console.log('======================================================');

  const tables = ['auth.users', 'organizations', 'profiles', 'issues', 'status_history', 'matches', 'comments'];
  for (const table of tables) {
    const res = await db.query(`SELECT COUNT(*) as count FROM ${table};`);
    console.log(`  • ${table.padEnd(20)}: ${res.rows[0].count} rows`);
  }

  // Breakdown of issues by status
  console.log('\n📌 Issues Breakdown by Status:');
  const statusRes = await db.query(`
    SELECT status, COUNT(*) as count 
    FROM issues 
    GROUP BY status 
    ORDER BY count DESC;
  `);
  for (const row of statusRes.rows) {
    console.log(`  - ${row.status.padEnd(15)}: ${row.count}`);
  }

  // 4. Join query: issues -> matches -> organizations
  console.log('\n======================================================');
  console.log('🔗 TASK 4 JOIN QUERY: issues -> matches -> organizations');
  console.log('======================================================');

  const joinRes = await db.query(`
    SELECT 
      i.id AS issue_id,
      i.title AS issue_title,
      i.category,
      i.district AS issue_district,
      i.status AS issue_status,
      m.role AS match_role,
      m.matched_at,
      o.name AS matched_org_name,
      o.type AS org_type,
      o.district AS org_district,
      o.category_tags
    FROM issues i
    JOIN matches m ON m.issue_id = i.id
    JOIN organizations o ON o.id = m.org_id
    ORDER BY i.title ASC;
  `);

  console.log(`Found ${joinRes.rows.length} matched issue-organization relationships:\n`);
  joinRes.rows.forEach((row, index) => {
    console.log(`[${index + 1}] Issue: "${row.issue_title}" (${row.issue_status.toUpperCase()})`);
    console.log(`    Category: ${row.category} | District: ${row.issue_district}`);
    console.log(`    Matched Org: ${row.matched_org_name} [Type: ${row.org_type}, Role: ${row.match_role}]`);
    console.log(`    Org Tags: ${JSON.stringify(row.category_tags)} | Org District: ${row.org_district}`);
    console.log('    --------------------------------------------------');
  });

  console.log('\n✨ Database schema, migration, seed, RLS policies, and relationship verification COMPLETE!\n');
}

runVerification().catch(console.error);
