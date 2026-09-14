import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import Toast from '../components/Toast.jsx';

export default function AdminOrgAccounts() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [selectedCitizens, setSelectedCitizens] = useState({}); // { [orgId]: citizenProfileId }
  const [updatingOrgId, setUpdatingOrgId] = useState(null);
  const [toast, setToast] = useState(null);

  // Require admin role
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (profile?.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  }, [user, profile, loading, navigate]);

  const loadData = useCallback(async () => {
    try {
      setFetching(true);
      // Fetch all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });

      if (orgsError) throw orgsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      setOrganizations(orgsData || []);
      setProfilesList(profilesData || []);
    } catch (err) {
      console.error('Error loading org management data:', err);
      setToast({ type: 'error', message: 'Failed to load organizations or user profiles.' });
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      loadData();
    }
  }, [user, profile, loadData]);

  // State for pending approvals
  const [selectedOrgForPending, setSelectedOrgForPending] = useState({}); // { [pendingId]: orgId }

  // Pending org signup options
  const pendingQueue = profilesList.filter(
    (p) => p.role === 'pending_org_rep' || (p.role === 'org_rep' && p.verified === false) || (p.role === 'org_rep' && !p.org_id)
  );

  // Handle approving a pending org signup & linking to chosen organization
  const handleApprovePendingOrgRep = async (pendingProfile) => {
    const targetOrgId = selectedOrgForPending[pendingProfile.id] || organizations[0]?.id;
    if (!targetOrgId) {
      setToast({ type: 'warning', message: 'Please select an organization to link with this user.' });
      return;
    }

    const targetOrg = organizations.find((o) => o.id === targetOrgId);

    try {
      setUpdatingOrgId(pendingProfile.id);

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'org_rep',
          org_id: targetOrgId,
          verified: true,
        })
        .eq('id', pendingProfile.id);

      if (error) throw error;

      setToast({
        type: 'success',
        message: `Approved & linked ${pendingProfile.full_name || 'User'} as Org Rep for "${targetOrg?.name || 'Organization'}"!`,
      });

      setSelectedOrgForPending((prev) => ({ ...prev, [pendingProfile.id]: '' }));
      await loadData();
    } catch (err) {
      console.error('Pending approval error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to approve org rep.' });
    } finally {
      setUpdatingOrgId(null);
    }
  };

  // Citizen options for dropdown
  const citizenOptions = profilesList.filter((p) => p.role === 'citizen');

  // Handle promoting a citizen to Org Rep for a specific organization
  const handlePromoteToOrgRep = async (org) => {
    const targetUserId = selectedCitizens[org.id];
    if (!targetUserId) {
      setToast({ type: 'warning', message: `Please select a citizen to promote for ${org.name}.` });
      return;
    }

    const targetProfile = profilesList.find((p) => p.id === targetUserId);
    if (!targetProfile) return;

    try {
      setUpdatingOrgId(org.id);

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'org_rep',
          org_id: org.id,
        })
        .eq('id', targetUserId);

      if (error) throw error;

      setToast({
        type: 'success',
        message: `Successfully promoted ${targetProfile.full_name || 'User'} to Org Rep for "${org.name}"!`,
      });

      // Reset selection for this org
      setSelectedCitizens((prev) => ({ ...prev, [org.id]: '' }));

      // Reload data
      await loadData();
    } catch (err) {
      console.error('Promotion error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to promote user to Org Rep.' });
    } finally {
      setUpdatingOrgId(null);
    }
  };

  // Handle demoting an Org Rep back to Citizen
  const handleRevokeOrgRep = async (repProfile, orgName) => {
    try {
      setUpdatingOrgId(repProfile.org_id);

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'citizen',
          org_id: null,
        })
        .eq('id', repProfile.id);

      if (error) throw error;

      setToast({
        type: 'info',
        message: `Revoked Org Rep status for ${repProfile.full_name || 'User'} from "${orgName}". Reverted to Citizen.`,
      });

      await loadData();
    } catch (err) {
      console.error('Revoke error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to revoke Org Rep role.' });
    } finally {
      setUpdatingOrgId(null);
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
          <span className="font-semibold text-sm">Loading Organization Accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white/80 nav-blur p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
            Admin Access Only
          </span>
          <span className="text-xs text-[var(--ink-soft)] font-medium">Gated Org Account Provisioning</span>
        </div>
        <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">Organization Accounts Management</h1>
        <p className="text-sm text-[var(--ink-soft)] max-w-3xl">
          Assign & promote authenticated citizen accounts to official Organization Representatives (`role='org_rep'`).
          Public self-signup is strictly reserved for Citizens — only admins can grant organization authority.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[var(--line)] shadow-sm">
          <div className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider">Total Organizations</div>
          <div className="text-2xl font-black text-[var(--ink)] mt-1">{organizations.length}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[var(--line)] shadow-sm">
          <div className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider">Assigned Org Reps</div>
          <div className="text-2xl font-black text-purple-700 mt-1">
            {profilesList.filter((p) => p.role === 'org_rep').length}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[var(--line)] shadow-sm">
          <div className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider">Available Citizens to Promote</div>
          <div className="text-2xl font-black text-[var(--brand)] mt-1">{citizenOptions.length}</div>
        </div>
      </div>

      {/* Pending Organization Verification Queue */}
      <div className="bg-amber-50/70 border border-amber-200 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                Action Needed ({pendingQueue.length})
              </span>
              <h2 className="text-lg font-black text-amber-950 tracking-tight">
                Pending Organization Verification Queue
              </h2>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Self-service organization signups awaiting administrative linkage to a registered organization.
            </p>
          </div>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/80 border border-amber-200 text-amber-800 text-xs font-medium text-center">
            ✅ No organization accounts currently awaiting verification.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingQueue.map((pending) => (
              <div
                key={pending.id}
                className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-amber-950">{pending.full_name || 'Org Rep User'}</div>
                      <div className="text-xs text-amber-700 font-mono">ID: {pending.id.slice(0, 8)}...</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      Pending Linkage
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-amber-100">
                  <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                    Select Target Organization to Link:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOrgForPending[pending.id] || organizations[0]?.id || ''}
                      onChange={(e) =>
                        setSelectedOrgForPending((prev) => ({
                          ...prev,
                          [pending.id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.district})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleApprovePendingOrgRep(pending)}
                      disabled={updatingOrgId === pending.id}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40 transition-all cursor-pointer shrink-0"
                    >
                      {updatingOrgId === pending.id ? 'Approving...' : 'Approve & Link'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizations List */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--ink)] tracking-tight">Registered Organizations & Representatives</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {organizations.map((org) => {
            const currentReps = profilesList.filter((p) => p.org_id === org.id && p.role === 'org_rep');

            return (
              <div
                key={org.id}
                className="bg-white/90 nav-blur p-6 rounded-3xl border border-[var(--line)] shadow-md flex flex-col justify-between space-y-5"
              >
                <div>
                  {/* Org Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                        {org.type}
                      </span>
                      <h3 className="text-lg font-bold text-[var(--ink)] mt-1">{org.name}</h3>
                      <div className="text-xs text-[var(--ink-soft)] font-medium">📍 {org.district}</div>
                    </div>
                  </div>

                  {/* Category Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {(org.category_tags || []).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--bg)] text-[var(--ink-soft)] border border-[var(--line)]">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Current Assigned Reps */}
                  <div className="mt-4 pt-4 border-t border-[var(--line)]">
                    <div className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-2">
                      Assigned Representative(s) ({currentReps.length})
                    </div>

                    {currentReps.length === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-amber-800 text-xs font-medium">
                        No Org Rep currently assigned. Promote a citizen below.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentReps.map((rep) => (
                          <div key={rep.id} className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center uppercase">
                                {(rep.full_name || 'U').charAt(0)}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-purple-950">{rep.full_name || 'Org Rep User'}</div>
                                <div className="text-[10px] text-purple-700 font-mono">ID: {rep.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeOrgRep(rep, org.name)}
                              disabled={updatingOrgId === org.id}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                              title="Revoke Org Rep authority and revert user to Citizen"
                            >
                              Revoke Rep
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Promote Citizen Dropdown */}
                <div className="pt-4 border-t border-[var(--line)] space-y-2">
                  <label className="block text-[11px] font-bold text-[var(--ink-soft)] uppercase tracking-wider">
                    Promote Existing Citizen Account
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCitizens[org.id] || ''}
                      onChange={(e) =>
                        setSelectedCitizens((prev) => ({
                          ...prev,
                          [org.id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Select Citizen Account --</option>
                      {citizenOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name || 'User'} ({c.id.slice(0, 8)}...)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handlePromoteToOrgRep(org)}
                      disabled={updatingOrgId === org.id || !selectedCitizens[org.id]}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer shrink-0"
                    >
                      {updatingOrgId === org.id ? 'Promoting...' : 'Promote'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
