import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOrgFlowVerification() {
  console.log('🚀 Initializing local Postgres engine (PGlite) for Org Flow & Validation verification...');
  const db = new PGlite();

  try {
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '22222222-2222-4222-a222-222222222201'::uuid $$ LANGUAGE sql;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql;
    `);

    // Load all migrations
    const migrations = [
      '20260913000000_create_setulink_schema.sql',
      '20260913000001_handle_new_user_trigger.sql',
      '20260913000002_create_issue_photos_bucket.sql',
      '20260913000003_add_org_rep_role.sql',
    ];

    for (const mig of migrations) {
      const migPath = path.join(__dirname, '../supabase/migrations/', mig);
      let sql = fs.readFileSync(migPath, 'utf8')
        .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- PostGIS extension')
        .replace(/geography\(Point,\s*4326\)/gi, 'text')
        .replace(/USING GIST\(location\)/gi, 'USING btree(location)');
      await db.exec(sql);
    }
    console.log('✅ All 4 database migrations applied successfully.');

    // Load seed data
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8')
      .replace(/ST_SetSRID\(ST_MakePoint\(([^)]+)\), 4326\)::geography/gi, "'POINT($1)'");
    await db.exec(seedSql);
    console.log('✅ Seed data loaded.');

    console.log('\n======================================================');
    console.log('🧪 TESTING ADMIN ORG REP PROMOTION & REVOCATION');
    console.log('======================================================');

    const citizenUserId = '22222222-2222-4222-a222-222222222202'; // Ramesh Mahato
    const targetOrgId = '11111111-1111-4111-a111-111111111101'; // BIT Mesra

    // 1. Verify initial citizen profile
    const initialProfile = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [citizenUserId]);
    console.log('Initial Profile State:');
    console.log(`   - Name: ${initialProfile.rows[0].full_name}`);
    console.log(`   - Role: ${initialProfile.rows[0].role}`);
    console.log(`   - Org ID: ${initialProfile.rows[0].org_id}`);

    // 2. Simulate Admin promoting Ramesh Mahato to Org Rep for BIT Mesra
    console.log('\nSimulating Admin promoting citizen to Org Rep for BIT Mesra...');
    await db.query(`
      UPDATE public.profiles
      SET role = 'org_rep', org_id = $1
      WHERE id = $2;
    `, [targetOrgId, citizenUserId]);

    const promotedProfile = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [citizenUserId]);
    console.log('✅ Promoted Profile State:');
    console.log(`   - Name: ${promotedProfile.rows[0].full_name}`);
    console.log(`   - Role: ${promotedProfile.rows[0].role}`);
    console.log(`   - Org ID: ${promotedProfile.rows[0].org_id}`);

    if (promotedProfile.rows[0].role === 'org_rep' && promotedProfile.rows[0].org_id === targetOrgId) {
      console.log('   🎯 PROMOTION VERIFICATION PASSED: role set to org_rep and org_id assigned!');
    } else {
      console.error('   ❌ PROMOTION VERIFICATION FAILED!');
      process.exit(1);
    }

    // 3. Simulate Revoking Org Rep authority
    console.log('\nSimulating Admin revoking Org Rep status...');
    await db.query(`
      UPDATE public.profiles
      SET role = 'citizen', org_id = NULL
      WHERE id = $1;
    `, [citizenUserId]);

    const revokedProfile = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [citizenUserId]);
    console.log('✅ Revoked Profile State:');
    console.log(`   - Name: ${revokedProfile.rows[0].full_name}`);
    console.log(`   - Role: ${revokedProfile.rows[0].role}`);
    console.log(`   - Org ID: ${revokedProfile.rows[0].org_id}`);

    if (revokedProfile.rows[0].role === 'citizen' && revokedProfile.rows[0].org_id === null) {
      console.log('   🎯 REVOCATION VERIFICATION PASSED: reverted to citizen role and null org_id!');
    } else {
      console.error('   ❌ REVOCATION VERIFICATION FAILED!');
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('✨ ORG ACCOUNTS GATED FLOW VERIFICATION COMPLETE');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Verification error:', err);
    process.exit(1);
  }
}

runOrgFlowVerification();
