import pg from 'pg';
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

const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

console.log('Testing PG direct connection...');
// Supabase connection formats
const hosts = [
  'db.uhmykasatoyspdfogygg.supabase.co',
  'aws-0-ap-south-1.pooler.supabase.com'
];

console.log('Service role key present, length:', serviceRoleKey?.length);
