import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [submitting, setSubmitting] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await signUp(email.trim(), password, fullName.trim());
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create an account. Please try again.');
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">Create your account</h2>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            Join SetuLink to report, track, or solve civic challenges across Jharkhand.
          </p>
        </div>

        {/* 4 Role Selection Cards */}
        <div className="space-y-2">
          <label className="text-xs font-black text-[var(--ink)] uppercase tracking-wider block">
            Register As
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('citizen')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                selectedRole === 'citizen'
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm'
                  : 'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-[var(--bg)]/40'
              }`}
            >
              <span className="text-lg">👤</span>
              <div>
                <div className="font-extrabold text-xs">Citizen</div>
                <div className={`text-[10px] ${selectedRole === 'citizen' ? 'text-white/80' : 'text-[var(--ink-soft)]'}`}>
                  Report Issues
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('govt')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                selectedRole === 'govt'
                  ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                  : 'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-blue-50/40'
              }`}
            >
              <span className="text-lg">🏛️</span>
              <div>
                <div className="font-extrabold text-xs">Govt Official</div>
                <div className={`text-[10px] ${selectedRole === 'govt' ? 'text-blue-100' : 'text-[var(--ink-soft)]'}`}>
                  Triage & Sanction
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('university')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                selectedRole === 'university'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                  : 'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-purple-50/40'
              }`}
            >
              <span className="text-lg">🎓</span>
              <div>
                <div className="font-extrabold text-xs">University</div>
                <div className={`text-[10px] ${selectedRole === 'university' ? 'text-purple-100' : 'text-[var(--ink-soft)]'}`}>
                  Faculty & R&D
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('industry')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                selectedRole === 'industry'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                  : 'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-emerald-50/40'
              }`}
            >
              <span className="text-lg">🏢</span>
              <div>
                <div className="font-extrabold text-xs">Industry / CSR</div>
                <div className={`text-[10px] ${selectedRole === 'industry' ? 'text-emerald-100' : 'text-[var(--ink-soft)]'}`}>
                  Grants & Pilots
                </div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Mahato"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
            />
          </div>

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
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
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
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--ink-soft)]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[var(--brand)] hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
