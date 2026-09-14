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

// Inspect JWT payload of serviceRoleKey to get project ref or role
const payloadBase64 = serviceRoleKey.split('.')[1];
const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
console.log('Service Role JWT Payload:', payloadJson);

// Supabase project connection details
// Host: db.uhmykasatoyspdfogygg.supabase.co or aws-0-ap-south-1.pooler.supabase.com
console.log('Project Ref: uhmykasatoyspdfogygg');
