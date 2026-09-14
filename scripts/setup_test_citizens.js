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

async function setupCitizens() {
  console.log('--- Setting up Test Citizen Accounts ---');

  const { data: usersData } = await adminClient.auth.admin.listUsers();
  
  // Find or create test citizen 1
  let c1 = usersData.users.find((u) => u.email === 'citizen1@setulink.com');
  if (!c1) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: 'citizen1@setulink.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Test Citizen One' },
    });
    if (error) console.error('Error creating citizen1:', error);
    else {
      c1 = data.user;
      console.log('Created citizen1@setulink.com:', c1.id);
    }
  } else {
    await adminClient.auth.admin.updateUserById(c1.id, { password: 'password123' });
    console.log('Updated password for citizen1@setulink.com');
  }

  if (c1) {
    await adminClient.from('profiles').upsert({ id: c1.id, full_name: 'Test Citizen One', role: 'citizen', verified: true });
  }

  // Find or create test citizen 2
  let c2 = usersData.users.find((u) => u.email === 'citizen2@setulink.com');
  if (!c2) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: 'citizen2@setulink.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Test Citizen Two' },
    });
    if (error) console.error('Error creating citizen2:', error);
    else {
      c2 = data.user;
      console.log('Created citizen2@setulink.com:', c2.id);
    }
  } else {
    await adminClient.auth.admin.updateUserById(c2.id, { password: 'password123' });
    console.log('Updated password for citizen2@setulink.com');
  }

  if (c2) {
    await adminClient.from('profiles').upsert({ id: c2.id, full_name: 'Test Citizen Two', role: 'citizen', verified: true });
  }

  console.log('Test citizens setup complete!');
}

setupCitizens();
