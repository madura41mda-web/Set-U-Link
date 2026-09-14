import pg from 'pg';
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

const databaseUrl = envVars['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:54322/postgres';

console.log('Testing pg connection...');
const client = new pg.Client({ connectionString: databaseUrl });
client.connect()
  .then(() => {
    console.log('Connected to pg successfully!');
    return client.end();
  })
  .catch((err) => {
    console.log('pg connection error:', err.message);
  });
