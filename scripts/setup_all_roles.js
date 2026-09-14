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

const TEST_ACCOUNTS = [
  {
    email: 'madura41mda@gmail.com',
    password: 'Password123!',
    fullName: 'BIT Sindri University Rep',
    role: 'org_rep',
    verified: true,
    orgType: 'university',
  },
  {
    email: 'madura.0741@gmail.com',
    password: 'Password123!',
    fullName: 'Tata Steel CSR Partner',
    role: 'org_rep',
    verified: true,
    orgType: 'csr',
  },
  {
    email: 'citizen@setulink.in',
    password: 'Password123!',
    fullName: 'Ranchi Citizen Reporter',
    role: 'citizen',
    verified: true,
  },
  {
    email: 'admin@setulink.in',
    password: 'Password123!',
    fullName: 'State Portal Administrator',
    role: 'admin',
    verified: true,
  },
  {
    email: 'panchayat@setulink.in',
    password: 'Password123!',
    fullName: 'Doranda Gram Panchayat Official',
    role: 'panchayat_rep',
    verified: true,
  },
];

async function setupAllRoles() {
  console.log('🚀 Setting up multi-role test accounts in live Supabase Auth...');

  const { data: orgs } = await adminClient.from('organizations').select('id, type');
  const uniOrg = orgs?.find((o) => o.type === 'university') || orgs?.[0];
  const indOrg = orgs?.find((o) => ['csr', 'startup', 'msme'].includes(o.type)) || orgs?.[1] || orgs?.[0];

  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const existingUsers = usersData?.users || [];

  for (const acc of TEST_ACCOUNTS) {
    let user = existingUsers.find((u) => u.email === acc.email);

    if (!user) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.fullName },
      });
      if (error) {
        console.error(`Error creating ${acc.email}:`, error.message);
        continue;
      }
      user = data.user;
      console.log(`✅ Created Auth User: ${acc.email} (${user.id})`);
    } else {
      await adminClient.auth.admin.updateUserById(user.id, {
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.fullName },
      });
      console.log(`🔄 Updated Auth User: ${acc.email}`);
    }

    // Set org_id if applicable
    let assignedOrgId = null;
    if (acc.role === 'org_rep') {
      assignedOrgId = acc.orgType === 'university' ? uniOrg?.id : indOrg?.id;
    }

    // Upsert profile
    const { error: profileErr } = await adminClient.from('profiles').upsert({
      id: user.id,
      full_name: acc.fullName,
      role: acc.role,
      verified: acc.verified,
      org_id: assignedOrgId,
    });

    if (profileErr) {
      console.warn(`Profile warning for ${acc.email}:`, profileErr.message);
    } else {
      console.log(`  └─ Profile configured (Role: ${acc.role}, OrgID: ${assignedOrgId || 'N/A'})`);
    }
  }

  console.log('✨ All 5 multi-role accounts created & configured successfully!');
}

setupAllRoles();
