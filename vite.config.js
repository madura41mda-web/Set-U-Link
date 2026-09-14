import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createClient } from '@supabase/supabase-js';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSupabase = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'setulink-api-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              res.setHeader('Content-Type', 'application/json');
              
              if (!adminSupabase) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Supabase service role client not initialized' }));
                return;
              }

              // Helper to parse JSON body
              let body = {};
              if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
                try {
                  const buffers = [];
                  for await (const chunk of req) {
                    buffers.push(chunk);
                  }
                  const raw = Buffer.concat(buffers).toString();
                  if (raw) body = JSON.parse(raw);
                } catch (err) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON body: ' + err.message }));
                  return;
                }
              }

              const path = req.url.split('?')[0];

              try {
                // 1. Claim issue from Universal Pool
                if (path === '/api/claim-issue' && req.method === 'POST') {
                  const { issue_id, org_id, role, admin_id, admin_name, org_name } = body;
                  if (!issue_id || !org_id) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing issue_id or org_id' }));
                    return;
                  }

                  // Insert match
                  const { data: matchData, error: matchErr } = await adminSupabase
                    .from('matches')
                    .insert([{ issue_id, org_id, role: role || 'govt' }])
                    .select('*, organizations(*)')
                    .single();

                  if (matchErr && matchErr.code !== '23505') throw matchErr;

                  // Update issue status to in_progress
                  await adminSupabase.from('issues').update({ status: 'in_progress' }).eq('id', issue_id);

                  // Insert status history
                  if (admin_id) {
                    await adminSupabase.from('status_history').insert([
                      { issue_id, stage: 'in_progress', outcome_type: 'pilot_test', changed_by: admin_id }
                    ]);
                  }

                  // Post claim comment
                  const claimer = admin_name || 'Admin';
                  const orgLabel = org_name || 'Department';
                  await adminSupabase.from('comments').insert([
                    {
                      issue_id,
                      author_id: admin_id,
                      body: `[TAKEN UP & CLAIMED by ${claimer} — ${orgLabel}]: Issue claimed from Universal Pool. Field review and triage active.`,
                      is_org_update: true,
                    }
                  ]);

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, match: matchData }));
                  return;
                }

                // 2. Triage issue
                if (path === '/api/triage-issue' && req.method === 'POST') {
                  const { issue_id, stage, outcome_type, admin_id, admin_name, org_name, custom_msg } = body;
                  if (!issue_id || !stage) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing issue_id or stage' }));
                    return;
                  }

                  const dbStage = stage === 'on_hold' ? 'validated' : stage === 'declined' ? 'reported' : stage;
                  await adminSupabase.from('issues').update({ status: dbStage }).eq('id', issue_id);

                  if (admin_id) {
                    await adminSupabase.from('status_history').insert([
                      { issue_id, stage: dbStage, outcome_type: outcome_type || null, changed_by: admin_id }
                    ]);
                  }

                  const orgLabel = org_name || 'Department Admin';
                  const msgBody = custom_msg || `[Triage Update — ${orgLabel}]: Status updated to ${stage.toUpperCase()}`;
                  await adminSupabase.from('comments').insert([
                    { issue_id, author_id: admin_id, body: msgBody, is_org_update: true }
                  ]);

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                  return;
                }

                // 3. Send official comment
                if (path === '/api/send-message' && req.method === 'POST') {
                  const { issue_id, author_id, body: msgBody, is_org_update } = body;
                  if (!issue_id || !msgBody) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing issue_id or body' }));
                    return;
                  }

                  const { data: commentData, error: commentErr } = await adminSupabase
                    .from('comments')
                    .insert([{ issue_id, author_id, body: msgBody, is_org_update: !!is_org_update }])
                    .select('*, profiles(*, organizations(*))')
                    .single();

                  if (commentErr) throw commentErr;

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, comment: commentData }));
                  return;
                }

                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not found' }));
              } catch (err) {
                console.error('API Server Error:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
              }
            } else {
              next();
            }
          });
        }
      }
    ]
  };
});
