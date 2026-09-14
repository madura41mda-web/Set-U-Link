import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase3Verification() {
  console.log('🚀 Initializing local Postgres engine (PGlite) for Phase 3 Auth verification...');
  const db = new PGlite();

  try {
    // Define auth schema stub & helper functions if needed
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT NULL::uuid $$ LANGUAGE sql;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'anon'::text $$ LANGUAGE sql;
    `);

    // 1. Read and apply schema migration
    const migration1Path = path.join(__dirname, '../supabase/migrations/20260913000000_create_setulink_schema.sql');
    let migration1Sql = fs.readFileSync(migration1Path, 'utf8')
      .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- PostGIS extension')
      .replace(/geography\(Point,\s*4326\)/gi, 'text')
      .replace(/USING GIST\(location\)/gi, 'USING btree(location)');

    await db.exec(migration1Sql);
    console.log('✅ Base schema migration applied.');

    // 2. Read and apply Phase 3 trigger migration
    const migration2Path = path.join(__dirname, '../supabase/migrations/20260913000001_handle_new_user_trigger.sql');
    console.log(`📜 Loading Trigger Migration: ${migration2Path}`);
    const migration2Sql = fs.readFileSync(migration2Path, 'utf8');
    await db.exec(migration2Sql);
    console.log('✅ Trigger migration applied successfully.');

    // 3. Load seed data
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8')
      .replace(/ST_SetSRID\(ST_MakePoint\(([^)]+)\), 4326\)::geography/gi, "'POINT($1)'");

    await db.exec(seedSql);
    console.log('✅ Seed data applied.');

    // 4. Test Auto-Profile Trigger Execution
    console.log('\n======================================================');
    console.log('🧪 TESTING AUTH TRIGGER (auth.users -> profiles)');
    console.log('======================================================');

    const testUserId1 = '77777777-7777-4777-a777-777777777701';
    console.log(`Simulating new user signup in auth.users with full_name metadata...`);
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
      VALUES (
        $1,
        'priya.sharma@example.com',
        '{"full_name": "Priya Sharma"}'::jsonb,
        NOW()
      );
    `, [testUserId1]);

    const profileRes1 = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [testUserId1]);
    if (profileRes1.rows.length === 1) {
      const p = profileRes1.rows[0];
      console.log('✅ Test User 1 Profile Auto-Created:');
      console.log(`   - ID: ${p.id}`);
      console.log(`   - Full Name: ${p.full_name}`);
      console.log(`   - Role: ${p.role}`);
      console.log(`   - Org ID: ${p.org_id}`);
      
      if (p.full_name === 'Priya Sharma' && p.role === 'citizen' && p.org_id === null) {
        console.log('   🎯 VERIFICATION PASSED: Metadata full_name & default citizen role correctly assigned!');
      } else {
        console.error('   ❌ VERIFICATION FAILED: Profile attributes mismatch!');
        process.exit(1);
      }
    } else {
      console.error('❌ Trigger failed to create profile for Test User 1!');
      process.exit(1);
    }

    // 5. Test Fallback Name when no metadata is supplied
    const testUserId2 = '77777777-7777-4777-a777-777777777702';
    console.log(`\nSimulating new user signup in auth.users WITHOUT metadata...`);
    await db.query(`
      INSERT INTO auth.users (id, email, created_at)
      VALUES (
        $1,
        'vikas.kumar@domain.com',
        NOW()
      );
    `, [testUserId2]);

    const profileRes2 = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [testUserId2]);
    if (profileRes2.rows.length === 1) {
      const p = profileRes2.rows[0];
      console.log('✅ Test User 2 Profile Auto-Created (Fallback Name):');
      console.log(`   - ID: ${p.id}`);
      console.log(`   - Full Name: ${p.full_name}`);
      console.log(`   - Role: ${p.role}`);

      if (p.full_name === 'vikas.kumar' && p.role === 'citizen') {
        console.log('   🎯 VERIFICATION PASSED: Fallback email prefix name & default citizen role correctly assigned!');
      } else {
        console.error('   ❌ VERIFICATION FAILED: Fallback profile attributes mismatch!');
        process.exit(1);
      }
    } else {
      console.error('❌ Trigger failed to create profile for Test User 2!');
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('✨ PHASE 3 SUPABASE AUTH & TRIGGER VERIFICATION COMPLETE');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Phase 3 verification error detail:', err);
    process.exit(1);
  }
}

runPhase3Verification();
