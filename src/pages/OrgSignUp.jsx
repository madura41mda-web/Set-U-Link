import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

const ORG_TYPES = [
  { value: 'university', label: 'University / Research Institute' },
  { value: 'csr', label: 'CSR / Corporate Fund' },
  { value: 'startup', label: 'Tech Startup / Innovation Partner' },
  { value: 'msme', label: 'Local Enterprise / MSME' },
  { value: 'govt', label: 'Government Agency / Department' },
  { value: 'research_institution', label: 'Research Institution / Innovation Hub' },
];

const DISTRICTS = ['Ranchi', 'Dhanbad', 'East Singhbhum', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'West Singhbhum'];

const ORG_SIGNUP_ALLOWLIST = {
  'madura41mda@gmail.com': ['university'],
  'madura.0741@gmail.com': ['csr', 'startup', 'msme', 'govt', 'research_institution'],
};

export default function OrgSignUp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Determine default org type based on sub-route URL e.g. /signup/university or /signup/industry
  const isUniversityRoute = location.pathname.includes('/university');
  const isIndustryRoute = location.pathname.includes('/industry');
  const initialType = isUniversityRoute ? 'university' : isIndustryRoute ? 'csr' : 'university';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState(initialType);
  const [district, setDistrict] = useState('Ranchi');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password || !orgName.trim()) {
      setError('Please fill in all required fields, including Organization Name.');
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

    const cleanEmail = email.trim().toLowerCase();
    const allowedTypes = ORG_SIGNUP_ALLOWLIST[cleanEmail];

    if (!allowedTypes) {
      setError('This email address is not authorized to register an organization account.');
      return;
    }

    if (!allowedTypes.includes(orgType)) {
      setError(`This email is not authorized for the selected organization type. Allowed organization type(s): ${allowedTypes.join(', ')}.`);
      return;
    }

    try {
      setSubmitting(true);
      // 1. Create auth user with metadata indicating org signup request
      const { user: newUser } = await signUp(email.trim(), password, fullName.trim());

      if (newUser) {
        // 2. Set profile role to 'pending_org_rep' and verified to false
        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert({
            id: newUser.id,
            full_name: fullName.trim(),
            role: 'pending_org_rep',
            verified: false,
            org_id: null,
          });

        if (profileErr) {
          console.warn('Profile update warning:', profileErr);
        }
      }

      // Navigate to pending verification screen
      navigate('/pending-verification');
    } catch (err) {
      console.error('Org Signup error:', err);
      setError(err.message || 'Failed to create organization account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 bg-white/90 nav-blur p-8 rounded-3xl border border-[var(--line)] shadow-2xl">
        <div className="text-center space-y-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white font-extrabold shadow-md">
            🏢
          </span>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 uppercase tracking-wider">
            Partner Organization Portal
          </span>
          <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
            Register Organization Representative
          </h2>
          <p className="text-xs text-[var(--ink-soft)] max-w-md mx-auto">
            Create an official partner account for your university, CSR fund, or enterprise to join SetuLink's tri-party resolution pipeline.
          </p>
        </div>

        {/* Verification Warning Box */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <span className="text-lg">🛡️</span>
          <div>
            <div className="font-extrabold uppercase tracking-wider text-amber-950">Verification Required</div>
            <div className="text-amber-800 mt-0.5">
              New organization registrations undergo administrative verification. Access to matched civic issues and the Org Dashboard will be granted upon admin review & linkage.
            </div>
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Full Name (Representative)
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Ananya Roy"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="representative@institution.edu.in"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. BIT Mesra / Tata Steel CSR"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Organization Type
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Headquarters / Primary Operating District
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 px-4 rounded-xl text-sm font-extrabold bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting Organization Registration...
              </>
            ) : (
              'Register Organization Account'
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-[var(--line)] space-y-2">
          <p className="text-xs text-[var(--ink-soft)]">
            Looking for standard citizen signup?{' '}
            <Link to="/signup" className="font-bold text-[var(--brand)] hover:underline">
              Citizen Signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
