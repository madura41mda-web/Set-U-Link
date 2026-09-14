import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Toast from '../components/Toast.jsx';

export default function PendingVerification() {
  const { user, profile, refreshProfile, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState(null);

  // If approved and has active org_rep role, automatically navigate to Org Dashboard
  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === 'org_rep' && profile.org_id) {
        navigate('/org-dashboard');
      }
    }
  }, [profile, loading, navigate]);

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      await refreshProfile();
      setToast({ type: 'info', message: 'Checked profile status with server.' });
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[85vh] pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="w-full max-w-md space-y-6 bg-white/90 nav-blur p-8 rounded-3xl border border-[var(--line)] shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-3xl font-bold shadow-sm animate-pulse">
          ⏳
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
            Pending Verification
          </span>
          <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
            Organization Account Pending Review
          </h2>
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
            Welcome, <strong className="text-[var(--ink)]">{profile?.full_name || user?.email}</strong>.
            Your organization representative account has been created and is currently awaiting administrative verification & linkage to an official partner organization row.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] text-xs text-left space-y-2">
          <div className="font-extrabold text-[var(--ink)] uppercase tracking-wider text-[10px]">What happens next?</div>
          <ul className="space-y-1.5 text-[var(--ink-soft)] list-disc list-inside">
            <li>A SetuLink platform administrator will verify your organization credentials.</li>
            <li>Once verified and linked, your account role will upgrade to <code className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded font-mono">org_rep</code>.</li>
            <li>You will gain access to matched civic challenges and the official Org Dashboard.</li>
          </ul>
        </div>

        <div className="pt-2 space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-3 px-4 rounded-xl text-xs font-extrabold bg-purple-700 hover:bg-purple-800 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {checking ? 'Refreshing Status...' : '🔄 Check Verification Status'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
