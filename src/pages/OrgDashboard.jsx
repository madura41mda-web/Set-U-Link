import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import StatusTracker from '../components/StatusTracker.jsx';
import Toast from '../components/Toast.jsx';
import { parseCoords } from '../lib/geoUtils.js';

const STAGE_LABELS = {
  reported: 'Reported',
  validated: 'Validated',
  matched: 'Matched',
  sanctioned: 'Sanctioned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

const STATUS_BADGES = {
  reported: 'bg-amber-50 text-amber-700 border-amber-200',
  validated: 'bg-blue-50 text-blue-700 border-blue-200',
  matched: 'bg-purple-50 text-purple-700 border-purple-200',
  sanctioned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const OUTCOME_TYPES = [
  { value: 'deployed_solution', label: 'Deployed Solution' },
  { value: 'research_output', label: 'Research Output' },
  { value: 'pilot_test', label: 'Pilot Test' },
  { value: 'policy_change', label: 'Policy Change' },
];

export default function OrgDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [matchesList, setMatchesList] = useState([]);
  const [orgDetails, setOrgDetails] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [updatingIssueId, setUpdatingIssueId] = useState(null);
  const [commentInput, setCommentInput] = useState({}); // { [issueId]: string }
  const [mentorInput, setMentorInput] = useState({}); // { [issueId]: string }
  const [outcomeTypes, setOutcomeTypes] = useState({}); // { [issueId]: string }
  const [toast, setToast] = useState(null);

  // Auth & role check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { state: { message: 'Please log in as an Organization Representative.' } });
      } else if (profile?.role === 'citizen') {
        navigate('/my-reports', { state: { message: 'Org Dashboard is for Organization Representatives.' } });
      }
    }
  }, [user, profile, loading, navigate]);

  const loadOrgData = useCallback(async () => {
    if (!user || !profile?.org_id) {
      setFetching(false);
      return;
    }

    try {
      setFetching(true);

      // Fetch organization details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();

      if (orgData) setOrgDetails(orgData);

      // Fetch matched issues for this organization
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*, issues(*, status_history(*)), organizations(*)')
        .eq('org_id', profile.org_id)
        .order('matched_at', { ascending: false });

      if (error) throw error;
      setMatchesList(matchesData || []);
    } catch (err) {
      console.error('Org dashboard fetch error:', err);
      setToast({ type: 'error', message: 'Failed to load organization matches.' });
    } finally {
      setFetching(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile?.org_id) {
      loadOrgData();
    }
  }, [user, profile, loadOrgData]);

  // Handle advancing status from org side (e.g. to 'in_progress' or 'resolved')
  const handleUpdateStatus = async (issue, targetStage) => {
    try {
      setUpdatingIssueId(issue.id);

      // 1. Update status in issues table
      const { error: issueErr } = await supabase
        .from('issues')
        .update({ status: targetStage })
        .eq('id', issue.id);

      if (issueErr) throw issueErr;

      // 2. Add status_history row
      const selectedOutcome = targetStage === 'resolved'
        ? (outcomeTypes[issue.id] || 'deployed_solution')
        : 'pilot_test';

      const { error: historyErr } = await supabase
        .from('status_history')
        .insert([
          {
            issue_id: issue.id,
            stage: targetStage,
            outcome_type: selectedOutcome,
            changed_by: user.id,
          },
        ]);

      if (historyErr) console.warn('Status history insert warning:', historyErr);

      // 3. Insert official org update comment
      const orgName = orgDetails?.name || 'Partner Organization';
      try {
        await supabase.from('comments').insert([
          {
            issue_id: issue.id,
            author_id: user.id,
            body: `[Org Update - ${orgName}]: Marked stage as ${STAGE_LABELS[targetStage].toUpperCase()}`,
            is_org_update: true,
          },
        ]);
      } catch (cErr) {
        console.warn('Org update comment insert warning:', cErr);
      }

      setToast({
        type: 'success',
        message: `Issue status updated to ${STAGE_LABELS[targetStage].toUpperCase()}!`,
      });

      if (targetStage === 'matched' || targetStage === 'resolved') {
        setTimeout(() => {
          setToast({
            type: 'info',
            message: `📱 [WhatsApp Alert Mock]: SMS & WhatsApp notification dispatched to citizen reporter (+91-98351XXXXX) & assigned org for status: ${STAGE_LABELS[targetStage].toUpperCase()}`,
          });
        }, 2000);
      }

      await loadOrgData();
    } catch (err) {
      console.error('Status update error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to update issue status.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // Handle adding an official comment/update
  const handleAddComment = async (issueId) => {
    const text = commentInput[issueId];
    if (!text || !text.trim()) return;

    try {
      setUpdatingIssueId(issueId);
      const orgName = orgDetails?.name || 'Partner Organization';
      const formattedBody = text.trim().startsWith('[Org Update')
        ? text.trim()
        : `[Org Update - ${orgName}]: ${text.trim()}`;

      const { error } = await supabase.from('comments').insert([
        {
          issue_id: issueId,
          author_id: user.id,
          body: formattedBody,
          is_org_update: true,
        },
      ]);

      if (error) throw error;

      setToast({ type: 'success', message: 'Official Organization Comment / Update posted!' });
      setCommentInput((prev) => ({ ...prev, [issueId]: '' }));
      await loadOrgData();
    } catch (err) {
      console.error('Comment error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to add comment.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // Handle assigning mentor/team (Module 3 - University Collaboration)
  const handleAssignMentor = async (issueId) => {
    const text = mentorInput[issueId];
    if (!text || !text.trim()) return;

    try {
      setUpdatingIssueId(issueId);
      const formattedBody = `🎓 Mentor/Team Assigned: ${text.trim()}`;

      const { error } = await supabase.from('comments').insert([
        {
          issue_id: issueId,
          author_id: user.id,
          body: formattedBody,
          is_org_update: true,
        },
      ]);

      if (error) throw error;

      setToast({ type: 'success', message: 'Mentor / Team assigned successfully!' });
      setMentorInput((prev) => ({ ...prev, [issueId]: '' }));
      await loadOrgData();
    } catch (err) {
      console.error('Mentor assignment error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to assign mentor/team.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--ink-soft)]">
          <svg className="animate-spin h-6 w-6 text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-sm">Loading Org Representative Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white/80 nav-blur p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl space-y-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
              {orgDetails?.type || 'Organization'} Portal
            </span>
            <span className="text-xs text-[var(--ink-soft)] font-medium">Official Representative Portal</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">
            {orgDetails?.name || 'Organization Dashboard'}
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">
            📍 District: <span className="font-bold text-[var(--ink)]">{orgDetails?.district || 'Jharkhand'}</span> •
            Managing tri-party matched civic challenges and deployment progress.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-3 rounded-2xl bg-purple-50 border border-purple-200 text-center">
            <div className="text-[10px] font-extrabold uppercase text-purple-700 tracking-wider">Matched Issues</div>
            <div className="text-2xl font-black text-purple-900 leading-tight">{matchesList.length}</div>
          </div>
        </div>
      </div>

      {/* Matched Issues List */}
      {matchesList.length === 0 ? (
        <div className="p-12 text-center bg-white/80 nav-blur rounded-3xl border border-[var(--line)] shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🏢
          </div>
          <h3 className="text-xl font-bold text-[var(--ink)]">No matched issues assigned yet</h3>
          <p className="text-sm text-[var(--ink-soft)] max-w-md mx-auto">
            When validated civic issues in {orgDetails?.district || 'your district'} match your organization's domain tags, they will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[var(--ink)] tracking-tight">Matched Civic Issues & Action Pipeline</h2>

          <div className="space-y-6">
            {matchesList.map((matchItem) => {
              const issue = matchItem.issues;
              if (!issue) return null;

              const coords = parseCoords(issue.location);
              const badgeStyle = STATUS_BADGES[issue.status] || STATUS_BADGES.reported;

              return (
                <div
                  key={matchItem.id}
                  className="bg-white/90 nav-blur rounded-3xl border border-[var(--line)] shadow-md overflow-hidden p-6 sm:p-8 space-y-6"
                >
                  {/* Issue Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                          {issue.category}
                        </span>
                        <span className="text-xs text-[var(--ink-soft)] font-medium">📍 {issue.district}</span>
                        {issue.area && (
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            🏘️ {issue.area}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                          {STAGE_LABELS[issue.status] || issue.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-[var(--ink)]">{issue.title}</h3>
                    </div>

                    {/* Actions dropdown/buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(issue, 'in_progress')}
                          disabled={updatingIssueId === issue.id}
                          className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition-all cursor-pointer"
                        >
                          ⚡ Mark as In Progress
                        </button>
                      )}

                      {issue.status !== 'resolved' && (
                        <div className="flex items-center gap-2">
                          <select
                            value={outcomeTypes[issue.id] || 'deployed_solution'}
                            onChange={(e) => setOutcomeTypes({ ...outcomeTypes, [issue.id]: e.target.value })}
                            className="px-2.5 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                            title="Select outcome type for resolution"
                          >
                            {OUTCOME_TYPES.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleUpdateStatus(issue, 'resolved')}
                            disabled={updatingIssueId === issue.id}
                            className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer shrink-0"
                          >
                            ✅ Mark as Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Issue Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-[var(--ink-soft)] tracking-wider mb-1">
                          Full Issue Description
                        </h4>
                        <p className="text-sm text-[var(--ink)] leading-relaxed bg-[var(--bg)]/50 p-4 rounded-2xl border border-[var(--line)] whitespace-pre-wrap font-medium">
                          {issue.description}
                        </p>
                      </div>

                      {/* Add Organization Comment / Update */}
                      <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-2">
                        <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                          Post Official Organization Comment / Update
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentInput[issue.id] || ''}
                            onChange={(e) => setCommentInput({ ...commentInput, [issue.id]: e.target.value })}
                            placeholder="Add action update (e.g. Site inspection scheduled for tomorrow)..."
                            className="flex-1 px-3.5 py-2 rounded-xl border border-purple-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleAddComment(issue.id)}
                            disabled={updatingIssueId === issue.id || !commentInput[issue.id]?.trim()}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-700 hover:bg-purple-800 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer shrink-0"
                          >
                            Post
                          </button>
                        </div>
                      </div>

                      {/* Assign Team / Mentor Form (Module 3) */}
                      <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                        <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                          🎓 Assign Team / Mentor
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={mentorInput[issue.id] || ''}
                            onChange={(e) => setMentorInput({ ...mentorInput, [issue.id]: e.target.value })}
                            placeholder="e.g. Dr. Ananya Roy + 3 students, Dept. of CS"
                            className="flex-1 px-3.5 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleAssignMentor(issue.id)}
                            disabled={updatingIssueId === issue.id || !mentorInput[issue.id]?.trim()}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-700 hover:bg-indigo-800 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer shrink-0"
                          >
                            Assign Team
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Side Info */}
                    <div className="space-y-4 bg-[var(--bg)]/40 p-4 rounded-2xl border border-[var(--line)]">
                      {issue.photo_url && (
                        <div className="rounded-xl overflow-hidden border border-[var(--line)] max-h-48">
                          <img
                            src={issue.photo_url}
                            alt={issue.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-[var(--line)] pb-1">
                          <span className="text-[var(--ink-soft)] font-bold">Matched Role:</span>
                          <span className="font-extrabold text-purple-800 uppercase">{matchItem.role}</span>
                        </div>
                        <div className="flex justify-between border-b border-[var(--line)] pb-1">
                          <span className="text-[var(--ink-soft)] font-bold">Latitude:</span>
                          <span className="font-mono text-slate-800">{coords.lat}</span>
                        </div>
                        <div className="flex justify-between border-b border-[var(--line)] pb-1">
                          <span className="text-[var(--ink-soft)] font-bold">Longitude:</span>
                          <span className="font-mono text-slate-800">{coords.lng}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--ink-soft)] font-bold">Submitter Type:</span>
                          <span className="font-bold text-slate-800 capitalize">{issue.submitter_type || 'Citizen'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Tracker */}
                  <div className="pt-4 border-t border-[var(--line)]">
                    <StatusTracker status={issue.status} statusHistory={issue.status_history} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
