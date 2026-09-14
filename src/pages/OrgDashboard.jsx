import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import StatusTracker from '../components/StatusTracker.jsx';
import Toast from '../components/Toast.jsx';
import { parseCoords } from '../lib/geoUtils.js';

// University Components
import UniversityStatsGrid from '../components/university/UniversityStatsGrid.jsx';
import TeamFormationModal from '../components/university/TeamFormationModal.jsx';
import RecommendedChallenges from '../components/university/RecommendedChallenges.jsx';
import UniversityChallengeSections from '../components/university/UniversityChallengeSections.jsx';
import { getDepartmentSuggestions, getExplainableMatchScore } from '../lib/departmentMatcher.js';

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
  const [commentInput, setCommentInput] = useState({});
  const [outcomeTypes, setOutcomeTypes] = useState({});
  const [toast, setToast] = useState(null);

  // University-specific state
  const [teamModalIssue, setTeamModalIssue] = useState(null);
  const [formedTeams, setFormedTeams] = useState({});
  const [reviewStatuses, setReviewStatuses] = useState({});

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

      // Fetch matched issues with status_history and comments (with author profiles)
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*, issues(*, status_history(*), comments(*, profiles(full_name, role))), organizations(*)')
        .eq('org_id', profile.org_id)
        .order('matched_at', { ascending: false });

      if (error) throw error;
      setMatchesList(matchesData || []);

      if (matchesData) {
        const revMap = {};
        matchesData.forEach((m) => {
          if (m.review_status) revMap[m.id] = m.review_status;
        });
        setReviewStatuses(revMap);
      }

      // Fetch project teams with team members and faculty mentors for persistence
      const { data: teamsData } = await supabase
        .from('project_teams')
        .select('*, team_members(*), faculty_mentors(*)')
        .eq('org_id', profile.org_id);

      if (teamsData) {
        const teamsMap = {};
        teamsData.forEach((t) => {
          teamsMap[t.issue_id] = {
            ...t,
            student_members: t.team_members || [],
            faculty_mentor: t.faculty_mentors || null
          };
        });
        setFormedTeams(teamsMap);
      }
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

      const channel = supabase
        .channel(`org-dashboard-changes-${profile.org_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issues' },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              setMatchesList((prev) =>
                prev.map((m) =>
                  m.issues?.id === payload.new.id
                    ? { ...m, issues: { ...m.issues, ...payload.new } }
                    : m
                )
              );
            } else {
              loadOrgData();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches', filter: `org_id=eq.${profile.org_id}` },
          () => {
            loadOrgData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comments' },
          () => {
            loadOrgData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, profile, loadOrgData]);

  // Status advance action
  const handleUpdateStatus = async (issue, targetStage) => {
    // Gate transition to 'sanctioned' for university orgs
    if (targetStage === 'sanctioned' && isUniversity) {
      const match = matchesList.find((m) => m.issues?.id === issue.id);
      const team = formedTeams[issue.id];
      const hasMentor = match?.assigned_mentor_id || team?.faculty_mentor_id || team?.faculty_mentor;
      const hasTeam = team?.student_members && team.student_members.length > 0;

      if (!hasMentor || !hasTeam) {
        setToast({
          type: 'error',
          message: 'Transition Gated: You must form a multidisciplinary student team and assign a faculty mentor before marking this challenge as Sanctioned.'
        });
        return;
      }
    }
    try {
      setUpdatingIssueId(issue.id);

      const { error: issueErr } = await supabase
        .from('issues')
        .update({ status: targetStage })
        .eq('id', issue.id);

      if (issueErr) throw issueErr;

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

      await loadOrgData();
    } catch (err) {
      console.error('Status update error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to update issue status.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // Add official comment / inquiry
  const handleAddComment = async (issueId, textParam) => {
    const text = textParam !== undefined ? textParam : commentInput[issueId];
    if (!text || !text.trim()) return;

    try {
      setUpdatingIssueId(issueId);
      const orgName = orgDetails?.name || 'Partner Organization';
      const formattedBody = (text.trim().startsWith('[Org Update') || text.trim().startsWith('[University Inquiry'))
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

      setToast({ type: 'success', message: 'Official Organization Update posted!' });
      setCommentInput((prev) => ({ ...prev, [issueId]: '' }));
      await loadOrgData();
    } catch (err) {
      console.error('Comment error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to add comment.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // Handle Review Actions (Accept / Reject / Request Info)
  const handleReviewAction = async (matchItem, actionType, payload = {}) => {
    const issue = matchItem.issues;
    try {
      if (actionType === 'accept') {
        setReviewStatuses((prev) => ({ ...prev, [matchItem.id]: 'accepted' }));
        await supabase.from('matches').update({ review_status: 'accepted' }).eq('id', matchItem.id);
        await handleUpdateStatus(issue, 'sanctioned');
        setToast({ type: 'success', message: `Accepted challenge: "${issue.title}". Challenge marked as Sanctioned.` });
      } else if (actionType === 'reject') {
        setReviewStatuses((prev) => ({ ...prev, [matchItem.id]: 'rejected' }));
        await supabase.from('matches').update({ review_status: 'rejected', review_notes: payload.reason }).eq('id', matchItem.id);
        
        await supabase.from('comments').insert([
          {
            issue_id: issue.id,
            author_id: user.id,
            body: `[University Review - ${orgDetails?.name || 'University'}]: Declined challenge. Reason: ${payload.reason}`,
            is_org_update: true
          }
        ]);

        setToast({ type: 'info', message: `Declined challenge: "${issue.title}".` });
      } else if (actionType === 'request_info') {
        setReviewStatuses((prev) => ({ ...prev, [matchItem.id]: 'info_requested' }));
        await supabase.from('matches').update({ review_status: 'info_requested' }).eq('id', matchItem.id);

        await supabase.from('comments').insert([
          {
            issue_id: issue.id,
            author_id: user.id,
            body: `[University Inquiry - ${orgDetails?.name || 'University'}]: ${payload.text}`,
            is_org_update: true
          }
        ]);

        setToast({ type: 'success', message: 'Inquiry posted! Citizen & Org notified.' });
      }
      await loadOrgData();
    } catch (err) {
      console.error('Review action error:', err);
      setToast({ type: 'error', message: 'Action execution failed.' });
    }
  };

  // Handle Adopting a Recommended Challenge
  const handleAdoptChallenge = async (issue) => {
    try {
      const { error } = await supabase.from('matches').insert([
        {
          issue_id: issue.id,
          org_id: orgDetails.id,
          role: 'university',
          review_status: 'accepted'
        }
      ]);

      if (error) throw error;

      await supabase.from('issues').update({ status: 'matched' }).eq('id', issue.id);

      setToast({ type: 'success', message: `Adopted challenge "${issue.title}"! Assigned to ${orgDetails.name}.` });
      await loadOrgData();
    } catch (err) {
      console.error('Adopt challenge error:', err);
      setToast({ type: 'error', message: 'Failed to adopt challenge.' });
    }
  };

  // Handle Team Created callback
  const handleTeamCreated = (teamData) => {
    setFormedTeams((prev) => ({
      ...prev,
      [teamData.issue_id]: teamData
    }));
    setToast({
      type: 'success',
      message: `Project Team "${teamData.team_name}" formed with ${teamData.student_members?.length || 0} students and Faculty Mentor ${teamData.faculty_mentor?.name || ''}!`
    });
  };

  // Handle Faculty Mentor Assigned
  const handleMentorAssigned = async (issueId, mentor) => {
    try {
      setFormedTeams((prev) => {
        const existing = prev[issueId] || {
          team_name: `R&D Team — ${orgDetails?.name || 'University'}`,
          departments: ['Civil & Environmental Engineering', 'Computer Science & Engineering'],
          student_members: []
        };
        return {
          ...prev,
          [issueId]: {
            ...existing,
            faculty_mentor_id: mentor.id,
            faculty_mentor: mentor
          }
        };
      });

      const match = matchesList.find((m) => m.issues?.id === issueId);
      if (match) {
        await supabase
          .from('matches')
          .update({ assigned_mentor_id: mentor.id })
          .eq('id', match.id);
      }

      setToast({ type: 'success', message: `Assigned Faculty Mentor ${mentor.name} (${mentor.department})` });
    } catch (err) {
      console.error('Mentor assignment error:', err);
      setToast({ type: 'error', message: 'Failed to assign mentor.' });
    }
  };

  const isUniversity = orgDetails?.type === 'university' || orgDetails?.type === 'research_institution';

  if (loading || fetching) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--ink-soft)]">
          <svg className="animate-spin h-6 w-6 text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-sm">Loading Organization Representative Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Hero Header */}
      <div className="bg-white/80 nav-blur p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl space-y-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isUniversity ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
            }`}>
              {isUniversity ? '🎓 University Innovation Hub' : '🏢 Partner Organization Portal'}
            </span>
            <span className="text-xs text-[var(--ink-soft)] font-semibold bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {isUniversity ? 'NAAC A++ | R&D Hub' : 'Official Portal'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">
            {orgDetails?.name || 'Organization Portal'}
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">
            📍 District: <span className="font-bold text-[var(--ink)]">{orgDetails?.district || 'Jharkhand'}</span> •
            {isUniversity
              ? ' Managing academic R&D teams, faculty mentors, and student innovation challenges.'
              : ' Managing tri-party matched civic challenges and deployment progress.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-3 rounded-2xl bg-purple-50 border border-purple-200 text-center">
            <div className="text-[10px] font-extrabold uppercase text-purple-700 tracking-wider">
              {isUniversity ? 'Assigned Challenges' : 'Matched Issues'}
            </div>
            <div className="text-2xl font-black text-purple-900 leading-tight">{matchesList.length}</div>
          </div>
        </div>
      </div>

      {/* University Stats Overview Grid */}
      {isUniversity && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-[var(--ink)] tracking-tight flex items-center gap-2">
            <span>📊</span> R&D Innovation Hub Overview
          </h2>
          <UniversityStatsGrid matches={matchesList} />
        </div>
      )}

      {/* Recommended Challenges Section for University */}
      {isUniversity && (
        <RecommendedChallenges
          orgDetails={orgDetails}
          onAdoptChallenge={handleAdoptChallenge}
        />
      )}

      {/* Matched Challenges List Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[var(--ink)] tracking-tight flex items-center gap-2">
            <span>{isUniversity ? '🔬' : '📋'}</span>
            {isUniversity ? 'Assigned University R&D Challenges' : 'Matched Civic Issues & Action Pipeline'}
          </h2>
          <span className="text-xs font-bold text-[var(--ink-soft)]">
            Total Matches: {matchesList.length}
          </span>
        </div>

        {matchesList.length === 0 ? (
          <div className="p-12 text-center bg-white/80 nav-blur rounded-3xl border border-[var(--line)] shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl font-bold">
              {isUniversity ? '🎓' : '🏢'}
            </div>
            <h3 className="text-xl font-bold text-[var(--ink)]">No matched challenges assigned yet</h3>
            <p className="text-sm text-[var(--ink-soft)] max-w-md mx-auto">
              When validated civic issues in {orgDetails?.district || 'your district'} match your organization's domain tags, they will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {matchesList.map((matchItem) => {
              const issue = matchItem.issues;
              if (!issue) return null;

              const badgeStyle = STATUS_BADGES[issue.status] || STATUS_BADGES.reported;
              const matchScore = getExplainableMatchScore(issue, orgDetails || matchItem.organizations);
              const reviewStatus = reviewStatuses[matchItem.id] || matchItem.review_status || 'pending';
              const formedTeam = formedTeams[issue.id];
              const issueComments = issue.comments || [];

              return (
                <div
                  key={matchItem.id}
                  className="bg-white/90 nav-blur rounded-3xl border border-[var(--line)] shadow-md overflow-hidden p-6 sm:p-8 space-y-6"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                          {issue.category}
                        </span>
                        <span className="text-xs font-bold text-[var(--ink-soft)]">📍 {issue.district}</span>
                        {issue.area && (
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            🏘️ {issue.area}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                          {STAGE_LABELS[issue.status] || issue.status}
                        </span>
                        {isUniversity && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            reviewStatus === 'accepted' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                            reviewStatus === 'rejected' ? 'bg-red-100 text-red-900 border-red-200' :
                            reviewStatus === 'info_requested' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                            'bg-amber-100 text-amber-900 border-amber-200'
                          }`}>
                            Review: {reviewStatus.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-[var(--ink)] tracking-tight mt-1">{issue.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-center">
                        <div className="text-[9px] font-black uppercase text-purple-700 tracking-wider">Explainable Match Score</div>
                        <div className="text-sm font-black text-purple-950">🎯 {matchScore.totalScore} / 100</div>
                      </div>
                    </div>
                  </div>

                  {/* Photo & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {issue.photo_url && (
                      <div className="rounded-2xl overflow-hidden h-48 border border-[var(--line)] bg-slate-900 shrink-0">
                        <img
                          src={issue.photo_url}
                          alt={issue.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      </div>
                    )}
                    <div className={issue.photo_url ? 'md:col-span-2 space-y-3' : 'md:col-span-3 space-y-3'}>
                      <p className="text-sm text-[var(--ink)] leading-relaxed bg-[var(--bg)]/50 p-4 rounded-2xl border border-[var(--line)] whitespace-pre-wrap">
                        {issue.description}
                      </p>

                      {/* Community Stats */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-[var(--ink-soft)] flex-wrap">
                        <span>👍 <strong className="text-[var(--ink)]">{issue.upvotes || 0}</strong> Upvotes</span>
                        <span>⭐ <strong className="text-[var(--ink)]">{Number(issue.avg_severity_score || 0).toFixed(1)}</strong> Avg Severity</span>
                        <span>🔥 Priority: <strong className="text-[var(--ink)]">{issue.priority_score || 60}</strong>/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Tracker */}
                  <div className="pt-2 border-t border-[var(--line)]">
                    <StatusTracker status={issue.status} statusHistory={issue.status_history} matches={[matchItem]} />
                  </div>

                  {/* UNIVERSITY HUB INLINE SECTIONS (New appended sections) */}
                  {isUniversity ? (
                    <UniversityChallengeSections
                      match={matchItem}
                      issue={issue}
                      orgDetails={orgDetails}
                      reviewStatus={reviewStatus}
                      formedTeam={formedTeam}
                      comments={issueComments}
                      user={user}
                      onReviewAction={handleReviewAction}
                      onUpdateStatus={handleUpdateStatus}
                      outcomeType={outcomeTypes[issue.id]}
                      onOutcomeTypeChange={(issueId, val) => setOutcomeTypes((prev) => ({ ...prev, [issueId]: val }))}
                      onOpenTeamModal={(i) => setTeamModalIssue(i)}
                      onMentorAssigned={handleMentorAssigned}
                      onAddComment={handleAddComment}
                      updatingIssueId={updatingIssueId}
                    />
                  ) : (
                    /* Non-University Partner Controls & Activity Feed */
                    <div className="space-y-4 pt-4 border-t border-[var(--line)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-700">Stage Action Controls:</div>
                        <div className="flex items-center gap-2">
                          {(issue.status === 'reported' || issue.status === 'validated') && (
                            <button
                              onClick={() => handleUpdateStatus(issue, 'matched')}
                              disabled={updatingIssueId === issue.id}
                              className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 border border-purple-700 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              Mark as Matched
                            </button>
                          )}

                          {issue.status === 'matched' && (
                            <button
                              onClick={() => handleUpdateStatus(issue, 'sanctioned')}
                              disabled={updatingIssueId === issue.id}
                              className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              Mark as Sanctioned
                            </button>
                          )}

                          {issue.status === 'sanctioned' && (
                            <button
                              onClick={() => handleUpdateStatus(issue, 'in_progress')}
                              disabled={updatingIssueId === issue.id}
                              className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-cyan-600 hover:bg-cyan-700 border border-cyan-700 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              Start In Progress / Field Testing
                            </button>
                          )}

                          {issue.status === 'in_progress' && (
                            <div className="flex items-center gap-2">
                              <select
                                value={outcomeTypes[issue.id] || 'deployed_solution'}
                                onChange={(e) => setOutcomeTypes({ ...outcomeTypes, [issue.id]: e.target.value })}
                                className="text-xs font-semibold p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
                              >
                                {OUTCOME_TYPES.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleUpdateStatus(issue, 'resolved')}
                                disabled={updatingIssueId === issue.id}
                                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                Mark as Resolved
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Redesigned Comments / Activity Feed for Non-University Orgs */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>📢 Official Updates & Inquiry Activity Log ({issueComments.length})</span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {issueComments.map((c) => (
                            <div key={c.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>🏛️ {c.profiles?.full_name || 'Organization Representative'}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{c.body}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-200">
                          <input
                            type="text"
                            value={commentInput[issue.id] || ''}
                            onChange={(e) => setCommentInput({ ...commentInput, [issue.id]: e.target.value })}
                            placeholder="Post official update / inquiry..."
                            className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddComment(issue.id)}
                            disabled={updatingIssueId === issue.id || !(commentInput[issue.id] || '').trim()}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 cursor-pointer disabled:opacity-50"
                          >
                            Post Update
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team Formation Modal */}
      {teamModalIssue && (
        <TeamFormationModal
          issue={teamModalIssue}
          orgDetails={orgDetails}
          onClose={() => setTeamModalIssue(null)}
          onTeamCreated={handleTeamCreated}
        />
      )}
    </div>
  );
}
