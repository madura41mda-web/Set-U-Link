import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { matchIssue } from '../lib/matchingEngine.js';
import StatusTracker from '../components/StatusTracker.jsx';
import RoleGate from '../components/RoleGate.jsx';
import Toast from '../components/Toast.jsx';
import { parseCoords, calculateDistanceMeters } from '../lib/geoUtils.js';

const NEXT_STAGE_MAP = {
  reported: 'validated',
  validated: 'matched',
  matched: 'sanctioned',
  sanctioned: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
};

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

export default function MyReports() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [selectedDetailIssue, setSelectedDetailIssue] = useState(null);
  const [adminViewMode, setAdminViewMode] = useState(false);
  const [advancingId, setAdvancingId] = useState(null);
  const [outcomeTypes, setOutcomeTypes] = useState({}); // { [issueId]: string }
  const [toast, setToast] = useState(null);

  const isAdmin = profile?.role === 'admin';

  // Fetch organizations for distance calculations
  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase.from('organizations').select('*');
      if (data) setOrganizations(data);
    };
    fetchOrgs();
  }, []);

  // Handle report deletion (simplified per Part 1 redesign & diagnosed per Part 3)
  const handleDeleteIssue = async (e, issueId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

    const targetIssue = issues.find((i) => i.id === issueId);
    const currentUserId = user?.id || profile?.id;

    console.log('🔍 Executing issue delete request:', {
      issueId,
      currentUserId,
      userRole: profile?.role,
      targetIssueReporterId: targetIssue?.reporter_id,
      targetIssueStatus: targetIssue?.status,
    });

    try {
      // Delete issue row directly with .select() to capture returned rows
      const { data, error } = await supabase
        .from('issues')
        .delete()
        .eq('id', issueId)
        .select();

      if (error) {
        console.error('❌ Postgres Delete Error Response:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Delete failed [Postgres ${error.code || 'RLS'}]: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Delete query returned 0 rows (RLS policy check failed):', {
          targetIssue,
          currentUserId,
        });
        throw new Error(
          `Could not delete report. (Reason: Only reports created by your account [${currentUserId}] in 'reported' or 'validated' stage can be deleted. Target reporter_id: '${targetIssue?.reporter_id}', status: '${targetIssue?.status}')`
        );
      }

      console.log('✅ Issue deleted successfully from database:', data);
      setToast({ type: 'success', message: 'Report deleted successfully!' });
      if (expandedIssueId === issueId) setExpandedIssueId(null);
      if (selectedDetailIssue?.id === issueId) setSelectedDetailIssue(null);
      await fetchIssues();
    } catch (err) {
      console.error('❌ Failed to delete issue:', err);
      setToast({ type: 'error', message: err.message || 'Failed to delete report.' });
    }
  };

  // Auth gate check
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { message: 'Please log in to view reported issues.' } });
    }
  }, [user, loading, navigate]);

  // Fetch reported issues JOINing status_history, matches(organizations(*)), AND comments(*, profiles(*, organizations(*)))
  const fetchIssues = useCallback(async () => {
    if (!user) return;
    try {
      setFetching(true);
      let query = supabase
        .from('issues')
        .select('*, status_history(*), matches(*, organizations(*)), comments(*, profiles(*, organizations(*)))')
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (!adminViewMode) {
        query = query.eq('reporter_id', profile?.id || user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIssues(data || []);

      if (data && data.length > 0 && !expandedIssueId) {
        setExpandedIssueId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching issues:', err);
      setToast({ type: 'error', message: 'Failed to load issues from Supabase.' });
    } finally {
      setFetching(false);
    }
  }, [user, profile, adminViewMode, expandedIssueId]);

  useEffect(() => {
    if (user) {
      fetchIssues();

      const channel = supabase
        .channel(`my-reports-changes-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issues' },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              setIssues((prev) =>
                prev.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
              );
              setSelectedDetailIssue((prev) =>
                prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev
              );
            } else {
              fetchIssues();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            fetchIssues();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comments' },
          () => {
            fetchIssues();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, adminViewMode, fetchIssues]);


  // Admin advance status handler with automatic matching engine trigger
  const handleAdvanceStatus = async (e, issue) => {
    e.stopPropagation();
    const nextStage = NEXT_STAGE_MAP[issue.status];
    if (!nextStage) return;

    try {
      setAdvancingId(issue.id);

      // 1. Update status in issues table
      const { error: issueError } = await supabase
        .from('issues')
        .update({ status: nextStage })
        .eq('id', issue.id);

      if (issueError) throw issueError;

      // 2. Insert into status_history
      const selectedOutcome = nextStage === 'resolved'
        ? (outcomeTypes[issue.id] || 'deployed_solution')
        : null;

      const { error: historyError } = await supabase
        .from('status_history')
        .insert([
          {
            issue_id: issue.id,
            stage: nextStage,
            outcome_type: selectedOutcome,
            changed_by: profile?.id || user.id,
          },
        ]);

      if (historyError) throw historyError;

      // 3. Trigger Matching Engine if status advanced to 'validated'
      if (nextStage === 'validated') {
        setToast({
          type: 'info',
          message: `Issue validated! Running Edge Matching Engine for ${issue.district}...`,
        });

        const matchResult = await matchIssue(issue.id, profile?.id || user.id);

        if (matchResult.matched && matchResult.matches?.length > 0) {
          const orgNames = matchResult.matches
            .map((m) => m.organizations?.name || m.org?.name || m.role)
            .join(', ');

          setToast({
            type: 'success',
            message: `🎉 Matched with ${matchResult.matches.length} organizations: ${orgNames}! Status updated to MATCHED.`,
          });
        } else {
          setToast({
            type: 'warning',
            message: `Issue validated. ${matchResult.reason || 'No matching organizations found for this district/category yet.'}`,
          });
        }
      } else {
        setToast({
          type: 'success',
          message: `Issue status advanced to ${STAGE_LABELS[nextStage].toUpperCase()}!`,
        });
      }

      if (nextStage === 'matched' || nextStage === 'resolved') {
        setTimeout(() => {
          setToast({
            type: 'info',
            message: `📱 [WhatsApp Alert Mock]: SMS & WhatsApp notification dispatched to citizen reporter (+91-98351XXXXX) & assigned org for status: ${STAGE_LABELS[nextStage].toUpperCase()}`,
          });
        }, 2000);
      }

      // Refresh list
      await fetchIssues();
    } catch (err) {
      console.error('Failed to advance status:', err);
      setToast({ type: 'error', message: err.message || 'Failed to advance status.' });
    } finally {
      setAdvancingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--ink-soft)]">
          <svg className="animate-spin h-6 w-6 text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-sm">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 nav-blur p-6 rounded-3xl border border-[var(--line)] shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--brand)]/10 text-[var(--brand)] uppercase tracking-wider">
              Phase 6: Matching Engine
            </span>
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Admin Mode Enabled
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">
            {adminViewMode ? 'All Platform Issues (Admin View)' : 'My Reported Issues'}
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">
            {adminViewMode
              ? 'Validating an issue automatically triggers the Edge Matching Engine to link Universities, CSRs & Govt.'
              : 'Track live stage progress and tri-party pipeline matches for your reported civic issues.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setAdminViewMode(!adminViewMode)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                adminViewMode
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                  : 'bg-white text-[var(--ink)] border-[var(--line)] hover:border-purple-400'
              }`}
            >
              {adminViewMode ? 'View My Submissions' : 'Switch to Admin All Issues View'}
            </button>
          )}

          <Link
            to="/report"
            className="btn-accent px-4 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Report Issue</span>
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {fetching ? (
        <div className="p-12 text-center bg-white/70 rounded-3xl border border-[var(--line)]">
          <svg className="animate-spin h-8 w-8 text-[var(--brand)] mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold text-[var(--ink-soft)]">Fetching reported issues & matches from Supabase...</p>
        </div>
      ) : issues.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white/80 nav-blur rounded-3xl border border-[var(--line)] shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
            📣
          </div>
          <h3 className="text-xl font-bold text-[var(--ink)]">No issues reported yet</h3>
          <p className="text-sm text-[var(--ink-soft)] max-w-md mx-auto">
            {adminViewMode
              ? 'There are no reported issues in the platform database yet.'
              : "You haven't submitted any civic issue reports yet. Be the first in your community to report!"}
          </p>
          <div className="pt-2">
            <Link to="/report" className="btn-accent px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg">
              Report an Issue Now
            </Link>
          </div>
        </div>
      ) : (
        /* Issues List */
        <div className="space-y-4">
          {issues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;
            const nextStage = NEXT_STAGE_MAP[issue.status];
            const badgeStyle = STATUS_BADGES[issue.status] || STATUS_BADGES.reported;

            const formattedDate = new Date(issue.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            const matchCount = (issue.matches || []).length;

            return (
              <div
                key={issue.id}
                className={`bg-white/90 nav-blur rounded-3xl border transition-all shadow-md overflow-hidden ${
                  isExpanded ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/10' : 'border-[var(--line)] hover:border-gray-300'
                }`}
              >
                {/* Summary Card Header */}
                <div
                  onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                  className="p-6 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Thumbnail with Error Fallback */}
                    {issue.photo_url ? (
                      <img
                        src={issue.photo_url}
                        alt={issue.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="w-16 h-16 rounded-2xl object-cover border border-[var(--line)] shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-2xl shrink-0">
                        📍
                      </div>
                    )}

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
                        <span className="text-xs text-[var(--ink-soft)] font-mono">📅 {formattedDate}</span>
                        {matchCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                            🤝 {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                          </span>
                        )}

                        {/* Feature 1: Duplicate badges */}
                        {issue.duplicate_of && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            🔗 Linked to existing report
                          </span>
                        )}

                        {(() => {
                          const dupsCount = issues.filter((i) => i.duplicate_of === issue.id).length;
                          if (dupsCount === 0) return null;
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              👥 {dupsCount} other {dupsCount === 1 ? 'citizen' : 'citizens'} reported this too
                            </span>
                          );
                        })()}
                      </div>
                      <h3 className="text-lg font-bold text-[var(--ink)] leading-snug">{issue.title}</h3>
                      <p className="text-xs text-[var(--ink-soft)] line-clamp-1">{issue.description}</p>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--line)] flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${badgeStyle}`}>
                      {STAGE_LABELS[issue.status] || issue.status}
                    </span>

                    {/* View Full Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailIssue(issue);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-[var(--brand)] border border-[var(--brand)]/30 hover:bg-[var(--brand)] hover:text-white transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View Full Details</span>
                    </button>

                    {/* Feature 2: Citizen Delete Report Button */}
                    {(issue.reporter_id === (profile?.id || user.id) || isAdmin) &&
                      ['reported', 'validated'].includes(issue.status) && (
                        <button
                          onClick={(e) => handleDeleteIssue(e, issue.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1"
                          title="Delete report"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      )}

                    {/* Admin Advance Button */}
                    <RoleGate allowedRoles={['admin']}>
                      {nextStage && (
                        <div className="flex items-center gap-2">
                          {nextStage === 'resolved' && (
                            <select
                              value={outcomeTypes[issue.id] || 'deployed_solution'}
                              onChange={(e) => setOutcomeTypes({ ...outcomeTypes, [issue.id]: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-2 rounded-xl border border-purple-200 bg-white text-xs font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                              title="Select outcome type for resolution"
                            >
                              {OUTCOME_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}

                          <button
                            onClick={(e) => handleAdvanceStatus(e, issue)}
                            disabled={advancingId === issue.id}
                            className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                            title={`Advance status from ${issue.status} to ${nextStage}`}
                          >
                            {advancingId === issue.id ? (
                              'Processing...'
                            ) : nextStage === 'validated' ? (
                              '⚡ Validate & Run Matching Engine'
                            ) : (
                              `⚡ Advance to ${STAGE_LABELS[nextStage]}`
                            )}
                          </button>
                        </div>
                      )}
                    </RoleGate>

                    <button className="p-1 rounded-lg text-gray-400 hover:text-[var(--ink)] transition-colors">
                      <svg
                        className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Stage Tracker Body */}
                {isExpanded && (
                  <div className="p-6 bg-[var(--bg)]/50 border-t border-[var(--line)] space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[var(--brand-deep)]">
                        Live Status Tracker & Audit Log
                      </h4>
                      <span className="text-xs text-[var(--ink-soft)] font-mono">
                        Issue ID: <span className="font-bold">{issue.id.slice(0, 8)}...</span>
                      </span>
                    </div>

                    <StatusTracker
                      status={issue.status}
                      statusHistory={issue.status_history}
                      matches={issue.matches}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Full Details Modal */}
      {selectedDetailIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-[var(--line)] relative">
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedDetailIssue(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
              title="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                  {selectedDetailIssue.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  📍 {selectedDetailIssue.district}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_BADGES[selectedDetailIssue.status] || STATUS_BADGES.reported}`}>
                  {STAGE_LABELS[selectedDetailIssue.status] || selectedDetailIssue.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  👤 Submitter: {selectedDetailIssue.submitter_type || 'citizen'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-[var(--ink)] leading-snug">{selectedDetailIssue.title}</h2>
              <p className="text-xs text-[var(--ink-soft)] font-mono mt-1">
                Issue ID: {selectedDetailIssue.id} • Submitted: {new Date(selectedDetailIssue.created_at).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Full Size Photo */}
            {selectedDetailIssue.photo_url ? (
              <div className="rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] shadow-inner max-h-96 flex items-center justify-center">
                <img
                  src={selectedDetailIssue.photo_url}
                  alt={selectedDetailIssue.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80';
                  }}
                  className="w-full h-full object-contain max-h-96"
                />
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[var(--bg)] border border-[var(--line)] text-center text-gray-400 text-sm font-semibold">
                📷 No photo attachment provided with this issue report.
              </div>
            )}

            {/* Full Description */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)] mb-1.5">Full Description</h3>
              <p className="text-sm text-[var(--ink)] leading-relaxed bg-[var(--bg)]/50 p-4 rounded-2xl border border-[var(--line)] whitespace-pre-wrap font-medium">
                {selectedDetailIssue.description}
              </p>
            </div>

            {/* Coordinates & Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="block text-slate-500 font-bold uppercase text-[10px]">District</span>
                <span className="font-extrabold text-slate-900">{selectedDetailIssue.district}</span>
              </div>
              <div>
                <span className="block text-slate-500 font-bold uppercase text-[10px]">Submitter Type</span>
                <span className="font-extrabold text-slate-900 capitalize">{selectedDetailIssue.submitter_type || 'Citizen'}</span>
              </div>
              <div>
                <span className="block text-slate-500 font-bold uppercase text-[10px]">Latitude</span>
                <span className="font-mono font-bold text-slate-900">{parseCoords(selectedDetailIssue.location).lat}</span>
              </div>
              <div>
                <span className="block text-slate-500 font-bold uppercase text-[10px]">Longitude</span>
                <span className="font-mono font-bold text-slate-900">{parseCoords(selectedDetailIssue.location).lng}</span>
              </div>
            </div>

            {/* Location Map View Preview Link */}
            {(() => {
              const coords = parseCoords(selectedDetailIssue.location);
              if (coords.lat === 'N/A' || coords.lng === 'N/A') return null;
              return (
                <div className="p-4 rounded-2xl bg-white border border-[var(--line)] space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Precise Issue Location Map
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[var(--brand)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open in Google Maps</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <iframe
                    title="Issue Location Map"
                    width="100%"
                    height="180"
                    className="rounded-xl border border-[var(--line)] shadow-inner"
                    src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=14&output=embed`}
                    loading="lazy"
                  />
                </div>
              );
            })()}

            {/* Feature 4: Recommended Partners Panel (Distance-Ranked Preview) */}
            {(() => {
              if (!selectedDetailIssue || !organizations || organizations.length === 0) return null;
              const issueCoords = parseCoords(selectedDetailIssue.location);
              if (issueCoords.lat === 'N/A' || issueCoords.lng === 'N/A') return null;

              const ranked = organizations
                .map((org) => {
                  // Use dedicated lat/lng columns when available;
                  // fall back to parseCoords on the PostGIS location column.
                  let orgLat, orgLng;
                  if (org.latitude != null && org.longitude != null) {
                    orgLat = org.latitude;
                    orgLng = org.longitude;
                  } else {
                    const orgCoords = parseCoords(org.location);
                    orgLat = orgCoords.lat;
                    orgLng = orgCoords.lng;
                  }
                  const distMeters = calculateDistanceMeters(
                    issueCoords.lat, issueCoords.lng,
                    orgLat, orgLng
                  );
                  return { ...org, distMeters, distKm: isFinite(distMeters) ? (distMeters / 1000).toFixed(1) : '?' };
                })
                .sort((a, b) => (isFinite(a.distMeters) ? a.distMeters : Infinity) - (isFinite(b.distMeters) ? b.distMeters : Infinity));

              // Support both old type values (seed data) and new collapsed values (Phase 1 bugfix)
              const academicOrgs  = ranked.filter((o) => ['university', 'research_institution'].includes(o.type)).slice(0, 2);
              const industryOrgs  = ranked.filter((o) => ['industry', 'csr', 'startup', 'msme', 'government', 'govt'].includes(o.type)).slice(0, 2);

              if (academicOrgs.length === 0 && industryOrgs.length === 0) return null;

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-100 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>Recommended Partners (Distance-Ranked Preview)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Likely Match Preview
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Academic / Research */}
                    <div className="bg-white/90 p-3 rounded-xl border border-indigo-100 space-y-2">
                      <div className="font-bold text-indigo-950 uppercase text-[10px] tracking-wider flex items-center justify-between">
                        <span>🎓 Nearest Academic Partners</span>
                        <span className="text-purple-600 font-semibold text-[9px]">Ranked</span>
                      </div>
                      {academicOrgs.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-800 truncate max-w-[170px]">{u.name}</span>
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                            {u.distKm} km
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Industry / CSR */}
                    <div className="bg-white/90 p-3 rounded-xl border border-indigo-100 space-y-2">
                      <div className="font-bold text-indigo-950 uppercase text-[10px] tracking-wider flex items-center justify-between">
                        <span>🏢 Nearest Industry & CSR</span>
                        <span className="text-blue-600 font-semibold text-[9px]">Ranked</span>
                      </div>
                      {industryOrgs.map((ind) => (
                        <div key={ind.id} className="flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-800 truncate max-w-[170px]">{ind.name}</span>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                            {ind.distKm} km
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Official Organization Updates / Responses */}
            {(() => {
              const orgComments = (selectedDetailIssue.comments || []).filter(
                (c) => c.is_org_update || c.body?.startsWith('[Org Update') || c.body?.startsWith('🎓 Mentor/Team Assigned:') || c.profiles?.role === 'org_rep'
              );

              if (orgComments.length === 0) return null;

              return (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                    <span>🏢</span>
                    <span>Official Updates & Action Plan from Partner Organizations ({orgComments.length})</span>
                  </h3>

                  <div className="space-y-2.5">
                    {orgComments.map((comment) => {
                      const isTeamAssigned = comment.body?.startsWith('🎓 Mentor/Team Assigned:');
                      const orgName = comment.profiles?.organizations?.name || selectedDetailIssue.matches?.[0]?.organizations?.name || 'Partner Organization';

                      if (isTeamAssigned) {
                        return (
                          <div key={comment.id} className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                                  Team Assigned
                                </span>
                                <span className="font-extrabold text-indigo-950">
                                  Update from {orgName}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                                {new Date(comment.created_at).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-950 leading-relaxed font-semibold whitespace-pre-wrap pt-0.5">
                              {comment.body}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div key={comment.id} className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-1.5 shadow-sm">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
                              <span>🏛️</span>
                              <span>Update from {orgName}</span>
                            </span>
                            <span className="text-[10px] font-mono text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                              {new Date(comment.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-purple-900 leading-relaxed font-medium whitespace-pre-wrap">
                            {comment.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Complete Status History Log */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)] mb-2.5">
                Complete Audit Log & Status History
              </h3>
              <div className="border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-[var(--line)] text-gray-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Stage</th>
                      <th className="px-4 py-2.5">Exact Timestamp</th>
                      <th className="px-4 py-2.5">Outcome / Note</th>
                      <th className="px-4 py-2.5">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] font-medium">
                    {(() => {
                      const logs = (selectedDetailIssue.status_history && selectedDetailIssue.status_history.length > 0)
                        ? [...selectedDetailIssue.status_history].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
                        : [
                            {
                              id: 'initial_log',
                              stage: selectedDetailIssue.status || 'reported',
                              changed_at: selectedDetailIssue.created_at,
                              outcome_type: null,
                              changed_by: selectedDetailIssue.reporter_id || 'System',
                            },
                          ];

                      return logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${STATUS_BADGES[log.stage] || STATUS_BADGES.reported}`}>
                              {STAGE_LABELS[log.stage] || log.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-700">
                            {new Date(log.changed_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {log.outcome_type ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">
                                {log.outcome_type}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">Standard transition</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                            {log.changed_by ? `${log.changed_by.slice(0, 8)}...` : 'System'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
