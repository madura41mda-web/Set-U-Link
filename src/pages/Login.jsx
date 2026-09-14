import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const loginData = await login(email.trim(), password);

      if (loginData?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role, verified, org_id')
          .eq('id', loginData.user.id)
          .single();

        if (userProfile?.role === 'pending_org_rep' || (userProfile?.role === 'org_rep' && (!userProfile?.verified || !userProfile?.org_id))) {
          navigate('/pending-verification');
          return;
        }

        if (userProfile?.role === 'org_rep' && userProfile?.verified && userProfile?.org_id) {
          navigate('/org-dashboard');
          return;
        }

        if (userProfile?.role === 'admin') {
          navigate('/admin/org-accounts');
          return;
        }
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white/80 nav-blur p-8 rounded-3xl border border-[var(--line)] shadow-xl">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white font-extrabold shadow-md mb-3">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </span>
          <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            Log in to manage civic issues, view matches, and track progress.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 btn-accent py-3.5 px-4 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging In...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-[var(--line)] space-y-2">
          <p className="text-xs text-[var(--ink-soft)]">
            Don't have an account yet?{' '}
            <Link to="/signup" className="font-bold text-[var(--brand)] hover:underline">
              Sign Up
            </Link>
          </p>

          <p className="text-[11px] text-[var(--ink-soft)] font-medium pt-1">
            Are you a university or industry partner?{' '}
            <Link to="/signup/organization" className="font-bold text-purple-700 hover:underline">
              Partner Signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
