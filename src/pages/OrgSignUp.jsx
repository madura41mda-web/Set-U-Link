import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_TYPES = [
  { value: 'university',  label: 'University' },
  { value: 'government',  label: 'Government' },
  { value: 'industry',    label: 'Industry' },
];

const DISTRICTS = [
  'Ranchi', 'Dhanbad', 'East Singhbhum', 'Bokaro', 'Hazaribagh',
  'Deoghar', 'Giridih', 'Ramgarh', 'West Singhbhum',
];

const UNIVERSITY_SPECIALIZATIONS = [
  'Civil Engineering',
  'Mechanical Engineering',
  'CSE',
  'Electrical Engineering',
  'Agriculture',
  'Environmental Engineering',
  'Water Resources',
  'Public Health',
  'Rural Development',
  'Other',
];

// Types that use the "focus area" field
const FOCUS_AREA_TYPES = new Set(['industry']);

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrgSignUp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Determine default org type from sub-route URL
  const isUniversityRoute = location.pathname.includes('/university');
  const isIndustryRoute   = location.pathname.includes('/industry');
  const initialType = isUniversityRoute ? 'university' : isIndustryRoute ? 'industry' : 'university';

  // ── Form state ──────────────────────────────────────────────
  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName,         setOrgName]         = useState('');
  const [orgType,         setOrgType]         = useState(initialType);
  const [district,        setDistrict]        = useState('Ranchi');

  // Phase-1 extended profile fields
  const [locationText,    setLocationText]    = useState('');   // free-text city/area
  const [specializations, setSpecializations] = useState([]);   // university multi-select
  const [jurisdiction,    setJurisdiction]    = useState('');   // government dept/corp
  const [focusArea,       setFocusArea]       = useState('');   // csr/startup/msme/ri

  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Specialization toggle ────────────────────────────────────
  const toggleSpecialization = (spec) => {
    setSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
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
    if (orgType === 'university' && specializations.length === 0) {
      setError('Please select at least one area of specialization for your university.');
      return;
    }

    try {
      setSubmitting(true);

      // ── Step 1: Create auth user ─────────────────────────────
      const { user: newUser } = await signUp(email.trim(), password, fullName.trim());
      if (!newUser) throw new Error('Account creation failed — no user returned.');

      // ── Step 2: Insert the organization row ──────────────────
      // Build org-profile extras based on type
      const orgExtras = {
        location:  locationText.trim() || null,
        specializations: orgType === 'university' && specializations.length > 0
          ? specializations
          : null,
        jurisdiction: orgType === 'government' && jurisdiction.trim()
          ? jurisdiction.trim()
          : null,
        focus_area: FOCUS_AREA_TYPES.has(orgType) && focusArea.trim()
          ? focusArea.trim()
          : null,
      };

      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name:          orgName.trim(),
          type:          orgType,
          district:      district,
          category_tags: [],
          ...orgExtras,
        })
        .select('id')
        .single();

      if (orgErr || !orgData?.id) {
        console.error('Organization insert error:', orgErr);
        throw new Error('Failed to create organization record. Please try again.');
      }

      // ── Step 3: Upsert profile — directly as org_rep ─────────
      // Phase-1: no pending_org_rep, no approval queue.
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id:        newUser.id,
          full_name: fullName.trim(),
          role:      'org_rep',
          verified:  true,
          org_id:    orgData.id,
        });

      if (profileErr) {
        // Non-fatal — log and continue; the auth session is created
        console.warn('Profile upsert warning:', profileErr);
      }

      // ── Step 4: Go straight to OrgDashboard ──────────────────
      navigate('/org-dashboard');
    } catch (err) {
      console.error('Org Signup error:', err);
      setError(err.message || 'Failed to create organization account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-[85vh] pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 bg-white/90 nav-blur p-8 rounded-3xl border border-[var(--line)] shadow-2xl">

        {/* Header */}
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
            Create an official partner account for your university, CSR fund, government department,
            or enterprise to join SetuLink's tri-party resolution pipeline.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>

          {/* Row 1: Full Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Full Name (Representative)
              </label>
              <input
                id="org-rep-fullname"
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
                id="org-rep-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="representative@institution.edu.in"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Org Name + Org Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Organization Name
              </label>
              <input
                id="org-name"
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
                id="org-type"
                value={orgType}
                onChange={(e) => {
                  setOrgType(e.target.value);
                  // Reset type-specific fields on change
                  setSpecializations([]);
                  setJurisdiction('');
                  setFocusArea('');
                }}
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

          {/* Row 3: District + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Headquarters District
              </label>
              <select
                id="org-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                City / Area
              </label>
              <input
                id="org-location"
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g. Ranchi, Jharkhand"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          {/* ── Conditional: University — Specializations ── */}
          {orgType === 'university' && (
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-2">
                Areas of Specialization <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {UNIVERSITY_SPECIALIZATIONS.map((spec) => {
                  const checked = specializations.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        checked
                          ? 'bg-purple-600 border-purple-700 text-white shadow-sm'
                          : 'bg-white border-[var(--line)] text-[var(--ink)] hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        checked ? 'bg-white border-white' : 'border-[var(--line)]'
                      }`}>
                        {checked && (
                          <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {spec}
                    </button>
                  );
                })}
              </div>
              {specializations.length > 0 && (
                <p className="mt-2 text-[10px] text-purple-700 font-semibold">
                  {specializations.length} selected: {specializations.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* ── Conditional: Government — Jurisdiction ── */}
          {orgType === 'government' && (
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Jurisdiction / Department Name
              </label>
              <input
                id="org-jurisdiction"
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. Dhanbad Municipal Corporation"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          )}

          {/* ── Conditional: CSR / Startup / MSME / RI — Focus Area ── */}
          {FOCUS_AREA_TYPES.has(orgType) && (
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Sector / Focus Area
                <span className="ml-1 normal-case text-[var(--ink-soft)] font-normal">(optional)</span>
              </label>
              <input
                id="org-focus-area"
                type="text"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="e.g. Clean water technology, Tribal livelihood"
                className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          )}

          {/* Row: Password + Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="org-rep-password"
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
                id="org-rep-confirm-password"
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
            id="org-signup-submit"
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
                Setting up your organization…
              </>
            ) : (
              'Register & Continue to Dashboard →'
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
