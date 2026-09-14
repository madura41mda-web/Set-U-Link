import { useState, useEffect, useCallback, useMemo } from 'react';
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

const STAGE_SUBTITLES = {
  reported: 'Initial citizen submission pending department triage',
  validated: 'Ground truth confirmed by Panchayat/ULB',
  matched: 'Matched with designated response department',
  sanctioned: 'Budget sanctioned & formal clearance granted',
  in_progress: 'Active on-ground implementation & engineering team assigned',
  resolved: 'Verified & closed',
};

const OUTCOME_TYPES = [
  { value: 'deployed_solution', label: '🚀 Deployed Solution / Ground Resolution' },
  { value: 'pilot_test', label: '🧪 Completed Field Pilot' },
  { value: 'policy_change', label: '📜 Official Policy / Sanction Order' },
  { value: 'student_project', label: '🎓 Student / Faculty Cohort Innovation' },
  { value: 'infrastructure_repair', label: '🏗️ Infrastructure / Municipal Overhaul' },
];

const STATUS_BADGES = {
  reported: 'bg-amber-50 text-amber-700 border-amber-200',
  validated: 'bg-blue-50 text-blue-700 border-blue-200',
  matched: 'bg-purple-50 text-purple-700 border-purple-200',
  sanctioned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TEMPLATE_RESPONSES = [
  {
    id: 'reviewed',
    label: '📋 Acknowledged & Under Review',
    text: 'We have received and reviewed your report. Our technical evaluation team is conducting a preliminary ground assessment.',
  },
  {
    id: 'team_assigned',
    label: '👷 On-Ground Team Dispatched',
    text: 'A specialized inspection and engineering crew has been dispatched to the reported site for immediate action.',
  },
  {
    id: 'approved_sanctioned',
    label: '💰 Budget & Project Approved',
    text: 'This civic initiative has been officially approved and sanctioned for implementation under our active work schedule.',
  },
  {
    id: 'on_hold',
    label: '❓ Need Details (On Hold)',
    text: 'We have put this report on temporary hold pending additional location details. Please provide nearby landmarks or contact info.',
  },
  {
    id: 'resolved',
    label: '✅ Verified & Resolved',
    text: 'This issue has been successfully resolved, tested, and verified on ground. Thank you for reporting and making Jharkhand better!',
  },
];

export default function OrgDashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [orgsList, setOrgsList] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const [matchesList, setMatchesList] = useState([]);
  const [unassignedPool, setUnassignedPool] = useState([]);
  const [activeTab, setActiveTab] = useState('pool'); // 'pool' | 'workspace'

  const [fetching, setFetching] = useState(true);
  const [updatingIssueId, setUpdatingIssueId] = useState(null);
  const [commentInput, setCommentInput] = useState({}); // { [issueId]: string }
  const [mentorInput, setMentorInput] = useState({}); // { [issueId]: string }
  const [outcomeTypes, setOutcomeTypes] = useState({}); // { [issueId]: string }
  const [toast, setToast] = useState(null);

  // Filter & Pagination state
  const [poolDistrictFilter, setPoolDistrictFilter] = useState('All');
  const [poolCategoryFilter, setPoolCategoryFilter] = useState('All');
  const [poolSearchTerm, setPoolSearchTerm] = useState('');
  const [poolPage, setPoolPage] = useState(1);
  const [workspacePage, setWorkspacePage] = useState(1);
  const PAGE_SIZE = 8;
  const [workspaceSearchTerm, setWorkspaceSearchTerm] = useState('');

  // 1. Load all registered organizations
  useEffect(() => {
    async function fetchAllOrgs() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          setOrgsList(data);
          if (profile?.org_id) {
            setSelectedOrgId(profile.org_id);
          } else if (data.length > 0) {
            setSelectedOrgId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Error loading orgs list:', err);
      }
    }

    fetchAllOrgs();
  }, [profile?.org_id]);

  // 2. Auth & role check
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { message: 'Please log in to access the Administration Dashboard.' } });
    }
  }, [user, loading, navigate]);

  // 3. Load Org data, claimed matches, and Universal Pool
  const loadOrgData = useCallback(async () => {
    const targetOrgId = selectedOrgId || profile?.org_id;

    if (!targetOrgId) {
      setFetching(false);
      return;
    }

    try {
      setFetching(true);

      // Fetch organization details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', targetOrgId)
        .single();

      if (orgData) setOrgDetails(orgData);

      // Fetch matched / claimed issues for this organization
      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*, issues(*, status_history(*), comments(*, profiles(*, organizations(*)))), organizations(*)')
        .eq('org_id', targetOrgId)
        .order('matched_at', { ascending: false });

      if (matchesErr) throw matchesErr;
      setMatchesList(matchesData || []);

      // Fetch all open issues in the system
      const { data: allIssues, error: issuesErr } = await supabase
        .from('issues')
        .select('*, status_history(*), matches(*, organizations(*)), comments(*, profiles(*, organizations(*)))')
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (issuesErr) throw issuesErr;

      if (allIssues && orgData) {
        const entityType = orgData.type; // 'university', 'govt', 'csr'/'startup'/'msme'
        const isGovt = entityType === 'govt';
        const isUni = entityType === 'university' || entityType === 'research_institution';
        const isIndustry = ['csr', 'startup', 'msme'].includes(entityType);

        const targetTag = isGovt ? 'Government' : isUni ? 'University' : 'Industry';

        // Filter unassigned reports targeted to this entity
        const matchedIssueIds = new Set((matchesData || []).map((m) => m.issue_id));

        const poolItems = allIssues.filter((i) => {
          // Exclude issues already claimed by this organization
          if (matchedIssueIds.has(i.id)) return false;

          // Check if description specifies target entity
          const desc = i.description || '';
          if (desc.includes(`[Target: ${targetTag}]`)) return true;

          // Or if no specific tag, match category tags
          if (!desc.includes('[Target:')) {
            const orgTags = orgData.category_tags || [];
            return orgTags.includes(i.category);
          }

          return false;
        });

        setUnassignedPool(poolItems);
      }
    } catch (err) {
      console.error('Org dashboard fetch error:', err);
      setToast({ type: 'error', message: 'Failed to load organization portal data.' });
    } finally {
      setFetching(false);
    }
  }, [selectedOrgId, profile?.org_id]);

  useEffect(() => {
    if (user && (selectedOrgId || profile?.org_id)) {
      loadOrgData();

      const targetOrgId = selectedOrgId || profile?.org_id;

      const channel = supabase
        .channel(`org-dashboard-live-${targetOrgId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issues' },
          () => {
            loadOrgData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
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
  }, [user, selectedOrgId, profile?.org_id, loadOrgData]);

  // Handle switching organization portal
  const handleOrgSwitch = async (e) => {
    const newOrgId = e.target.value;
    setSelectedOrgId(newOrgId);

    if (user && profile && (!profile.org_id || profile.org_id !== newOrgId)) {
      try {
        await supabase
          .from('profiles')
          .update({ org_id: newOrgId, role: 'org_rep', verified: true })
          .eq('id', user.id);
        if (refreshProfile) refreshProfile();
      } catch (err) {
        console.warn('Profile org switch notice:', err);
      }
    }
  };

  // ACTION: "Take Up / Claim Issue" from Universal Pool
  // ACTION: "Take Up / Claim Issue" from Universal Pool
  const handleTakeUpIssue = async (issue) => {
    const targetOrgId = selectedOrgId || profile?.org_id;
    if (!targetOrgId) {
      setToast({ type: 'warning', message: 'Please select an active organization portal.' });
      return;
    }

    try {
      setUpdatingIssueId(issue.id);

      const orgType = orgDetails?.type || 'govt';
      const roleType = orgType === 'university' ? 'university' : orgType === 'govt' ? 'govt' : 'industry';
      const adminName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';

      // 1. Try backend API first (uses service role, bypasses RLS)
      try {
        const res = await fetch('/api/claim-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue_id: issue.id,
            org_id: targetOrgId,
            role: roleType,
            admin_id: user?.id,
            admin_name: adminName,
            org_name: orgDetails?.name || 'Department'
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setToast({
              type: 'success',
              message: `⚡ Successfully taken up "${issue.title}"! Moved to your Personal Workspace.`,
            });
            setActiveTab('workspace');
            await loadOrgData();
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API endpoint fallback, attempting direct Supabase query:', apiErr);
      }

      // 2. Direct Supabase fallback
      const { error: matchErr } = await supabase.from('matches').insert([
        {
          issue_id: issue.id,
          org_id: targetOrgId,
          role: roleType,
        },
      ]);

      if (matchErr && matchErr.code !== '23505') throw matchErr;

      await supabase
        .from('issues')
        .update({ status: 'in_progress' })
        .eq('id', issue.id);

      await supabase.from('status_history').insert([
        {
          issue_id: issue.id,
          stage: 'in_progress',
          outcome_type: 'pilot_test',
          changed_by: user.id,
        },
      ]);

      await supabase.from('comments').insert([
        {
          issue_id: issue.id,
          author_id: user.id,
          body: `[TAKEN UP & CLAIMED by ${adminName} — ${orgDetails?.name || 'Department'}]: Issue claimed from Universal Pool. Triage and on-ground review active.`,
          is_org_update: true,
        },
      ]);

      setToast({
        type: 'success',
        message: `⚡ Successfully taken up "${issue.title}"! Moved to your Personal Workspace.`,
      });

      setActiveTab('workspace');
      await loadOrgData();
    } catch (err) {
      console.error('Take up error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to claim issue.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // ACTION: Triage Status Advance (Approve, On Hold, Decline, Sanction, Resolve)
  const handleTriageStatus = async (issue, targetStage) => {
    try {
      setUpdatingIssueId(issue.id);
      const adminName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
      const selectedOutcome = targetStage === 'resolved'
        ? (outcomeTypes[issue.id] || 'deployed_solution')
        : null;

      // 1. Try backend API first
      try {
        const res = await fetch('/api/triage-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue_id: issue.id,
            stage: targetStage,
            outcome_type: selectedOutcome,
            admin_id: user?.id,
            admin_name: adminName,
            org_name: orgDetails?.name || 'Department',
            custom_msg: `[Triage Update — ${orgDetails?.name || 'Admin'}]: Status marked as ${STAGE_LABELS[targetStage]?.toUpperCase() || targetStage.toUpperCase()}`
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setToast({
              type: 'success',
              message: `Issue triaged to: ${STAGE_LABELS[targetStage]?.toUpperCase() || targetStage}! Citizen notified in real time.`,
            });
            await loadOrgData();
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API triage fallback:', apiErr);
      }

      // 2. Direct Supabase fallback
      const dbStage = targetStage === 'on_hold' ? 'validated' : targetStage === 'declined' ? 'reported' : targetStage;

      const { error: issueErr } = await supabase
        .from('issues')
        .update({ status: dbStage })
        .eq('id', issue.id);

      if (issueErr) throw issueErr;

      await supabase.from('status_history').insert([
        {
          issue_id: issue.id,
          stage: dbStage,
          outcome_type: selectedOutcome,
          changed_by: user.id,
        },
      ]);

      await supabase.from('comments').insert([
        {
          issue_id: issue.id,
          author_id: user.id,
          body: `[Triage Update - ${orgDetails?.name || 'Admin'}]: Status marked as ${STAGE_LABELS[targetStage]?.toUpperCase() || targetStage.toUpperCase()}`,
          is_org_update: true,
        },
      ]);

      setToast({
        type: 'success',
        message: `Issue triaged to: ${STAGE_LABELS[targetStage]?.toUpperCase() || targetStage}! Citizen notified in real time.`,
      });

      await loadOrgData();
    } catch (err) {
      console.error('Triage error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to triage status.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // ACTION: Send Quick 1-Click Message Template
  const handleSendTemplateMessage = async (issueId, templateText) => {
    if (!templateText || !templateText.trim()) return;

    try {
      setUpdatingIssueId(issueId);
      const orgName = orgDetails?.name || 'Department Representative';
      const formattedBody = `[Official Update — ${orgName}]: ${templateText.trim()}`;

      // 1. Try backend API first
      try {
        const res = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue_id: issueId,
            author_id: user?.id,
            body: formattedBody,
            is_org_update: true
          })
        });
        if (res.ok) {
          setToast({ type: 'success', message: '💬 Response message sent to Citizen reporter in real time!' });
          setCommentInput((prev) => ({ ...prev, [issueId]: '' }));
          await loadOrgData();
          return;
        }
      } catch (apiErr) {
        console.warn('API send message fallback:', apiErr);
      }

      // 2. Direct Supabase fallback
      const { error } = await supabase.from('comments').insert([
        {
          issue_id: issueId,
          author_id: user.id,
          body: formattedBody,
          is_org_update: true,
        },
      ]);

      if (error) throw error;

      setToast({ type: 'success', message: '💬 Response message sent to Citizen reporter in real time!' });
      setCommentInput((prev) => ({ ...prev, [issueId]: '' }));
      await loadOrgData();
    } catch (err) {
      console.error('Template message error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to send message.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // ACTION: Assign Faculty Mentor & Team (University Admin)
  const handleAssignMentor = async (issueId) => {
    const text = mentorInput[issueId];
    if (!text || !text.trim()) return;

    try {
      setUpdatingIssueId(issueId);
      const formattedBody = `🎓 [Faculty Mentor & Multidisciplinary Team Assigned]: ${text.trim()}`;

      const { error } = await supabase.from('comments').insert([
        {
          issue_id: issueId,
          author_id: user.id,
          body: formattedBody,
          is_org_update: true,
        },
      ]);

      if (error) throw error;

      setToast({ type: 'success', message: 'Faculty Mentor & Team assigned successfully!' });
      setMentorInput((prev) => ({ ...prev, [issueId]: '' }));
      await loadOrgData();
    } catch (err) {
      console.error('Mentor assignment error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to assign mentor.' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  // Filter Universal Pool with useMemo
  const filteredPool = useMemo(() => {
    return unassignedPool.filter((item) => {
      if (poolDistrictFilter !== 'All' && item.district !== poolDistrictFilter) return false;
      if (poolCategoryFilter !== 'All' && item.category !== poolCategoryFilter) return false;
      if (poolSearchTerm.trim()) {
        const term = poolSearchTerm.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(term);
        const matchArea = (item.area || '').toLowerCase().includes(term);
        const matchDesc = (item.description || '').toLowerCase().includes(term);
        return matchTitle || matchArea || matchDesc;
      }
      return true;
    });
  }, [unassignedPool, poolDistrictFilter, poolCategoryFilter, poolSearchTerm]);

  const totalPoolPages = Math.max(1, Math.ceil(filteredPool.length / PAGE_SIZE));
  const paginatedPool = useMemo(() => {
    const start = (poolPage - 1) * PAGE_SIZE;
    return filteredPool.slice(start, start + PAGE_SIZE);
  }, [filteredPool, poolPage]);

  const totalWorkspacePages = Math.max(1, Math.ceil(matchesList.length / PAGE_SIZE));
  const paginatedWorkspace = useMemo(() => {
    const start = (workspacePage - 1) * PAGE_SIZE;
    return matchesList.slice(start, start + PAGE_SIZE);
  }, [matchesList, workspacePage]);

  const entityIcon = orgDetails?.type === 'university' ? '🎓' : orgDetails?.type === 'govt' ? '🏛️' : '🏢';
  const entityTitle = orgDetails?.type === 'university' ? 'University Collaboration Hub' : orgDetails?.type === 'govt' ? 'Government Department CMS' : 'Industry & CSR Partner Portal';

  if (loading || fetching) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--ink-soft)]">
          <svg className="animate-spin h-6 w-6 text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-sm">Loading Administration CMS Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header & Portal Switcher */}
      <div className="bg-white/90 nav-blur p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl space-y-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>{entityIcon}</span>
              <span>{entityTitle}</span>
            </span>
            <span className="text-xs text-[var(--ink-soft)] font-medium">Real-Time CMS Engine</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">
            {orgDetails?.name || 'Administrator Dashboard'}
          </h1>
          <p className="text-sm text-[var(--ink-soft)]">
            📍 District: <span className="font-bold text-[var(--ink)]">{orgDetails?.district || 'Jharkhand'}</span> •
            Logged in as <strong className="text-[var(--ink)]">{profile?.full_name || user?.email}</strong>
          </p>
        </div>

        {/* Portal Switcher Dropdown */}
        <div className="flex flex-col gap-1.5 shrink-0 lg:items-end bg-purple-50/70 p-3 rounded-2xl border border-purple-200">
          <label className="text-[10px] font-black uppercase text-purple-950 tracking-wider">
            Switch Admin Role / Entity Portal
          </label>
          <select
            value={selectedOrgId || ''}
            onChange={handleOrgSwitch}
            className="px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-extrabold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm max-w-xs"
          >
            {orgsList.map((org) => (
              <option key={org.id} value={org.id}>
                {org.type === 'university' ? '🎓' : org.type === 'govt' ? '🏛️' : '🏢'} {org.name} ({org.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pool')}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pool'
                ? 'bg-purple-700 text-white shadow-lg ring-2 ring-purple-300'
                : 'bg-white text-[var(--ink-soft)] border border-[var(--line)] hover:bg-gray-50'
            }`}
          >
            <span>🌐</span>
            <span>Universal Category Pool ({unassignedPool.length} Unclaimed)</span>
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'workspace'
                ? 'bg-purple-700 text-white shadow-lg ring-2 ring-purple-300'
                : 'bg-white text-[var(--ink-soft)] border border-[var(--line)] hover:bg-gray-50'
            }`}
          >
            <span>👤</span>
            <span>My Claimed Workspace ({matchesList.length} Active)</span>
          </button>
        </div>

        <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>WebSocket Realtime Active</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNIVERSAL CATEGORY POOL (Incoming Unassigned Reports) */}
      {/* ========================================================================= */}
      {activeTab === 'pool' && (
        <div className="space-y-6">
          {/* Universal Pool Explainer Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-3xl shadow-lg space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-black text-lg flex items-center gap-2">
                <span>🌐</span>
                <span>Universal {entityIcon} Pool — Incoming Citizen Challenges</span>
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
                Multi-Admin Category Queue ({filteredPool.length} Available)
              </span>
            </div>
            <p className="text-xs text-purple-100 leading-relaxed max-w-3xl">
              All unassigned civic issues submitted by citizens and routed to <strong>{orgDetails?.name || 'your department'}</strong> appear in this universal queue. Click <strong>"⚡ Take Up / Claim Issue"</strong> on any report to assign it to your personal workspace for triage, mentor assignment, budget sanction, and messaging.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={poolSearchTerm}
              onChange={(e) => {
                setPoolSearchTerm(e.target.value);
                setPoolPage(1);
              }}
              placeholder="🔍 Search pool issues by title, locality..."
              className="px-4 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <select
              value={poolDistrictFilter}
              onChange={(e) => {
                setPoolDistrictFilter(e.target.value);
                setPoolPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Jharkhand Districts</option>
              {['Ranchi', 'Dhanbad', 'East Singhbhum', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'West Singhbhum'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={poolCategoryFilter}
              onChange={(e) => {
                setPoolCategoryFilter(e.target.value);
                setPoolPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Categories</option>
              {['Water Supply', 'Roads & Infrastructure', 'Sanitation & Waste', 'Electricity & Power', 'Education & Youth', 'Healthcare & Clinics', 'Pollution & Environment', 'Drainage & Waterlogging', 'Parks & Public Spaces'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Universal Pool Cards Grid */}
          {filteredPool.length === 0 ? (
            <div className="p-12 text-center bg-white/80 nav-blur rounded-3xl border border-[var(--line)] shadow-sm space-y-3">
              <div className="text-3xl">🎉</div>
              <h3 className="text-base font-bold text-[var(--ink)]">No unclaimed issues in universal pool</h3>
              <p className="text-xs text-[var(--ink-soft)] max-w-md mx-auto">
                All incoming citizen reports for this category have been claimed by admins, or no reports match your active filter.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedPool.map((issue) => {
                  return (
                    <div
                      key={issue.id}
                      className="p-6 rounded-3xl bg-white border border-[var(--line)] shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Badge bar */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                              {issue.category}
                            </span>
                            <span className="text-xs font-bold text-[var(--ink-soft)]">📍 {issue.district}</span>
                            {issue.area && (
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                🏘️ {issue.area}
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            🔥 Priority: {issue.priority_score || 50}
                          </span>
                        </div>

                        {/* Title & Photo */}
                        <h4 className="font-black text-lg text-[var(--ink)] leading-snug">{issue.title}</h4>

                        {issue.photo_url && (
                          <div className="rounded-xl overflow-hidden h-40 border border-[var(--line)]">
                            <img
                              src={issue.photo_url}
                              alt={issue.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80';
                              }}
                            />
                          </div>
                        )}

                        <p className="text-xs text-[var(--ink)] leading-relaxed bg-[var(--bg)]/50 p-3.5 rounded-xl border border-[var(--line)] line-clamp-4">
                          {issue.description}
                        </p>
                      </div>

                      {/* Action Button: TAKE UP */}
                      <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3">
                        <div className="text-[11px] text-[var(--ink-soft)]">
                          👍 {issue.upvotes || 0} citizen upvotes
                        </div>

                        <button
                          onClick={() => handleTakeUpIssue(issue)}
                          disabled={updatingIssueId === issue.id}
                          className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <span>⚡</span>
                          <span>Take Up / Claim Issue</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pool Pagination Controls */}
              {totalPoolPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPoolPage((p) => Math.max(1, p - 1))}
                    disabled={poolPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs font-bold text-[var(--ink-soft)] px-3">
                    Page {poolPage} of {totalPoolPages} ({filteredPool.length} issues)
                  </span>
                  <button
                    onClick={() => setPoolPage((p) => Math.min(totalPoolPages, p + 1))}
                    disabled={poolPage === totalPoolPages}
                    className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY CLAIMED WORKSPACE (Active, Triage & Messaging) */}
      {/* ========================================================================= */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {matchesList.length === 0 ? (
            <div className="p-12 text-center bg-white/80 nav-blur rounded-3xl border border-[var(--line)] shadow-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl font-bold">
                📋
              </div>
              <h3 className="text-xl font-bold text-[var(--ink)]">Your workspace is currently empty</h3>
              <p className="text-sm text-[var(--ink-soft)] max-w-md mx-auto">
                You haven't claimed any issues from the Universal Category Pool yet. Switch to the <strong>Universal Category Pool</strong> tab and click "Take Up" on incoming reports!
              </p>
              <button
                onClick={() => setActiveTab('pool')}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-purple-700 text-white shadow-md hover:bg-purple-800 transition-all cursor-pointer"
              >
                Browse Universal Pool →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedWorkspace.map((matchItem) => {
                const issue = matchItem.issues;
                if (!issue) return null;

                const coords = parseCoords(issue.location);
                const badgeStyle = STATUS_BADGES[issue.status] || STATUS_BADGES.reported;
                const commentsList = issue.comments || [];

                return (
                  <div
                    key={matchItem.id}
                    className="bg-white rounded-3xl border border-[var(--line)] shadow-lg overflow-hidden p-6 sm:p-8 space-y-6"
                  >
                    {/* Top Status Bar (Matching Screenshot) */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold ${
                          issue.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : issue.status === 'in_progress'
                            ? 'bg-cyan-100 text-cyan-700'
                            : issue.status === 'sanctioned'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {issue.status === 'resolved' ? '✓' : issue.status === 'in_progress' ? '⚡' : issue.status === 'sanctioned' ? '🏛️' : '📋'}
                        </div>
                        <div>
                          <div className="font-extrabold text-base text-[var(--ink)] leading-tight capitalize">
                            {STAGE_LABELS[issue.status] || issue.status}
                          </div>
                          <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                            {STAGE_SUBTITLES[issue.status] || 'Active processing on SetuLink'}
                          </div>
                          <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                            Active since {new Date(issue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(issue.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                        CURRENT STAGE
                      </div>
                    </div>

                    {/* Category & District Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                        <span className="text-purple-700">{issue.category}</span>
                        <span>•</span>
                        <span>📍 {issue.district}</span>
                        {issue.area && <span>({issue.area})</span>}
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${STATUS_BADGES[issue.status] || STATUS_BADGES.reported}`}>
                          {STAGE_LABELS[issue.status] || issue.status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
                        {issue.title}
                      </h2>
                    </div>

                    {/* Main 2-Column Content Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left 2-Column Details & Actions */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <h4 className="text-[11px] font-black uppercase text-[var(--ink-soft)] tracking-wider mb-2">
                            FULL ISSUE DESCRIPTION
                          </h4>
                          <p className="text-sm text-[var(--ink)] leading-relaxed bg-[var(--bg)]/40 p-4 rounded-2xl border border-[var(--line)] whitespace-pre-wrap font-medium">
                            {issue.description}
                          </p>
                        </div>

                        {/* Post Official Comment / Update */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-black uppercase text-[var(--ink-soft)] tracking-wider">
                            POST OFFICIAL ORGANIZATION COMMENT / UPDATE
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentInput[issue.id] || ''}
                              onChange={(e) => setCommentInput({ ...commentInput, [issue.id]: e.target.value })}
                              placeholder="Add action update (e.g. Site inspection scheduled for tomorrow)..."
                              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendTemplateMessage(issue.id, commentInput[issue.id]);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSendTemplateMessage(issue.id, commentInput[issue.id])}
                              disabled={updatingIssueId === issue.id || !commentInput[issue.id]?.trim()}
                              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-pink-500 hover:bg-pink-600 shadow-md transition-all cursor-pointer disabled:opacity-40 shrink-0"
                            >
                              Post
                            </button>
                          </div>
                        </div>

                        {/* Assign Team / Mentor */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-black uppercase text-[var(--ink-soft)] tracking-wider flex items-center gap-1.5">
                            <span>🎓</span>
                            <span>ASSIGN TEAM / MENTOR</span>
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={mentorInput[issue.id] || ''}
                              onChange={(e) => setMentorInput({ ...mentorInput, [issue.id]: e.target.value })}
                              placeholder="e.g. Dr. Ananya Roy + 3 students, Dept. of CS"
                              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAssignMentor(issue.id)}
                              disabled={updatingIssueId === issue.id || !mentorInput[issue.id]?.trim()}
                              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all cursor-pointer disabled:opacity-40 shrink-0"
                            >
                              Assign Team
                            </button>
                          </div>
                        </div>

                        {/* Contextual Scenario-Based Triage Buttons */}
                        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase text-purple-950 tracking-wider flex items-center gap-1.5">
                              <span>⚡</span>
                              <span>Contextual Triage Actions</span>
                            </label>
                            <span className="text-[10px] text-purple-700 font-bold">1-Click State Advance</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {/* 1. Dispatch Ground Team */}
                            <button
                              type="button"
                              onClick={() => handleTriageStatus(issue, 'in_progress')}
                              disabled={updatingIssueId === issue.id || issue.status === 'in_progress'}
                              className="px-3.5 py-2 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                            >
                              <span>👷</span>
                              <span>Dispatch Ground Team</span>
                            </button>

                            {/* 2. Sanction Budget / Grant */}
                            <button
                              type="button"
                              onClick={() => handleTriageStatus(issue, 'sanctioned')}
                              disabled={updatingIssueId === issue.id || issue.status === 'sanctioned'}
                              className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                            >
                              <span>💰</span>
                              <span>Sanction Budget / Grant</span>
                            </button>

                            {/* 3. Approve Field Pilot */}
                            <button
                              type="button"
                              onClick={() => handleTriageStatus(issue, 'in_progress')}
                              disabled={updatingIssueId === issue.id}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <span>🧪</span>
                              <span>Approve Field Pilot</span>
                            </button>

                            {/* 4. Request Info / Hold */}
                            <button
                              type="button"
                              onClick={() => handleTriageStatus(issue, 'on_hold')}
                              disabled={updatingIssueId === issue.id || issue.status === 'on_hold'}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                            >
                              <span>⏸️</span>
                              <span>Request Info / Hold</span>
                            </button>

                            {/* 5. Reject / Close Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleTriageStatus(issue, 'declined')}
                              disabled={updatingIssueId === issue.id}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-900 hover:bg-red-200 border border-red-300 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <span>❌</span>
                              <span>Reject / Duplicate</span>
                            </button>

                            {/* 6. Mark Resolved */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              <select
                                value={outcomeTypes[issue.id] || 'deployed_solution'}
                                onChange={(e) => setOutcomeTypes({ ...outcomeTypes, [issue.id]: e.target.value })}
                                className="px-2.5 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                              >
                                {OUTCOME_TYPES.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleTriageStatus(issue, 'resolved')}
                                disabled={updatingIssueId === issue.id || issue.status === 'resolved'}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                              >
                                <span>🏆</span>
                                <span>Mark Resolved</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Live Update Thread */}
                        {commentsList.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black uppercase text-[var(--ink-soft)] tracking-wider">
                              LIVE ACTION & COMMENT TRAIL ({commentsList.length})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto p-1">
                              {commentsList.map((c) => (
                                <div
                                  key={c.id}
                                  className={`p-3 rounded-xl text-xs space-y-1 border ${
                                    c.is_org_update
                                      ? 'bg-purple-50/70 border-purple-200 text-purple-950 font-medium'
                                      : 'bg-white border-[var(--line)] text-[var(--ink)]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] text-[var(--ink-soft)]">
                                    <strong className={c.is_org_update ? 'text-purple-900 font-extrabold' : 'text-slate-800 font-bold'}>
                                      {c.profiles?.full_name || 'User / Admin'}
                                    </strong>
                                    <span>{new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="leading-relaxed">{c.body}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Photo & Exact Metadata (Matching Screenshot) */}
                      <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden border border-[var(--line)] shadow-sm bg-gray-100 max-h-56">
                          <img
                            src={issue.photo_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80'}
                            alt={issue.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-2.5 text-xs bg-[var(--bg)]/50 p-4 rounded-2xl border border-[var(--line)]">
                          <div className="flex justify-between border-b border-gray-200/60 pb-2">
                            <span className="text-[var(--ink-soft)] font-bold">Matched Role:</span>
                            <span className="font-extrabold text-[var(--ink)] uppercase">
                              {matchItem.role || orgDetails?.type || 'GOVERNMENT'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-200/60 pb-2">
                            <span className="text-[var(--ink-soft)] font-bold">Latitude:</span>
                            <span className="font-mono font-bold text-gray-800">{coords.lat}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-200/60 pb-2">
                            <span className="text-[var(--ink-soft)] font-bold">Longitude:</span>
                            <span className="font-mono font-bold text-gray-800">{coords.lng}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--ink-soft)] font-bold">Submitter Type:</span>
                            <span className="font-extrabold text-[var(--ink)] capitalize">
                              {issue.submitter_type || 'Panchayat'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Stepper */}
                    <div className="pt-4 border-t border-[var(--line)]">
                      <StatusTracker status={issue.status} statusHistory={issue.status_history} matches={[matchItem]} />
                    </div>
                  </div>
                );
              })}

              {/* Workspace Pagination Controls */}
              {totalWorkspacePages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setWorkspacePage((p) => Math.max(1, p - 1))}
                    disabled={workspacePage === 1}
                    className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs font-bold text-[var(--ink-soft)] px-3">
                    Page {workspacePage} of {totalWorkspacePages} ({matchesList.length} active issues)
                  </span>
                  <button
                    onClick={() => setWorkspacePage((p) => Math.min(totalWorkspacePages, p + 1))}
                    disabled={workspacePage === totalWorkspacePages}
                    className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
