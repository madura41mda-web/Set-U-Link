import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'How it Works', to: '/how-it-works' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Community Feed', to: '/feed' },
  { label: 'Impact', to: '/impact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      setMenuOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Account';
  const roleLabel = profile?.role ? profile.role.toUpperCase().replace('_', ' ') : null;

  return (
    <header
      id="nav"
      className="fixed top-0 left-0 right-0 z-50 nav-blur bg-white/80 border-b border-[var(--line)] shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white font-extrabold shadow-md">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18 14 8l6 6" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="14" cy="8" r="2" />
              <circle cx="20" cy="14" r="2" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="font-extrabold text-[1.05rem] tracking-tight">SetuLink</div>
            <div className="text-[10px] uppercase tracking-[.18em] text-[var(--ink-soft)] -mt-0.5">Bridge to Resolution</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[var(--ink-soft)]">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link hover:text-[var(--ink)]${isActive ? ' active' : ''}`}
          >
            Home
          </NavLink>

          <NavLink
            to="/how-it-works"
            className={({ isActive }) => `nav-link hover:text-[var(--ink)]${isActive ? ' active' : ''}`}
          >
            How it Works
          </NavLink>

          <NavLink
            to="/feed"
            className={({ isActive }) => `nav-link hover:text-[var(--ink)]${isActive ? ' active' : ''}`}
          >
            Community Feed
          </NavLink>

          <NavLink
            to="/impact"
            className={({ isActive }) => `nav-link hover:text-[var(--ink)]${isActive ? ' active' : ''}`}
          >
            Impact
          </NavLink>

          {/* Role specific single portal tab */}
          {user && profile?.role === 'org_rep' && (
            <NavLink
              to="/org-dashboard"
              className={({ isActive }) => `nav-link text-purple-700 font-extrabold hover:text-purple-900 flex items-center gap-1.5${isActive ? ' active' : ''}`}
            >
              <span>🏢</span>
              <span>Org Dashboard</span>
            </NavLink>
          )}

          {user && profile?.role !== 'org_rep' && (
            <NavLink
              to="/my-reports"
              className={({ isActive }) => `nav-link font-bold hover:text-[var(--ink)]${isActive ? ' active' : ''}`}
            >
              My Reports
            </NavLink>
          )}

          {profile?.role === 'admin' && (
            <NavLink
              to="/admin/org-accounts"
              className={({ isActive }) => `nav-link text-purple-700 font-bold hover:text-purple-900${isActive ? ' active' : ''}`}
            >
              Org Approvals
            </NavLink>
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {profile?.role !== 'org_rep' && (
            <Link to="/report" className="btn-accent text-xs font-extrabold text-white px-4 py-2 rounded-xl shadow-md inline-flex items-center gap-1">
              <span>+</span>
              <span>Report Issue</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--line)]">
              <Link
                to={profile?.role === 'org_rep' ? '/org-dashboard' : '/my-reports'}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--brand)] transition-all"
                title="View Account Portal"
              >
                <span className="w-6 h-6 rounded-lg bg-[var(--brand)] text-white font-extrabold text-xs flex items-center justify-center uppercase">
                  {displayName.charAt(0)}
                </span>
                <div className="text-xs">
                  <div className="font-bold text-[var(--ink)] leading-tight max-w-[120px] truncate">{displayName}</div>
                  {roleLabel && (
                    <div className="text-[9px] font-semibold text-[var(--brand)] tracking-wider">
                      {roleLabel}
                    </div>
                  )}
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--line)]">
              <Link
                to="/login"
                className="text-xs font-bold text-[var(--ink)] hover:text-[var(--brand)] px-3 py-2 rounded-xl transition-all"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] hover:border-[var(--brand)] transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button
          id="menuBtn"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--line)] bg-white"
          aria-label="Open menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg id="menuIcon" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <div id="mobileMenu" className={`mobile-menu lg:hidden bg-white border-t border-[var(--line)]${menuOpen ? ' open' : ''}`}>
        <div className="px-5 py-4 flex flex-col gap-1 text-[var(--ink-soft)]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="mnav py-2.5 px-3 rounded-lg hover:bg-[var(--bg)] font-medium text-sm"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {user && profile?.role === 'org_rep' && (
            <Link
              to="/org-dashboard"
              className="mnav py-2.5 px-3 rounded-lg bg-purple-50 font-bold text-sm text-purple-900"
              onClick={() => setMenuOpen(false)}
            >
              🏢 Org Dashboard
            </Link>
          )}

          {user && profile?.role !== 'org_rep' && (
            <Link
              to="/my-reports"
              className="mnav py-2.5 px-3 rounded-lg hover:bg-[var(--bg)] font-bold text-sm text-[var(--ink)]"
              onClick={() => setMenuOpen(false)}
            >
              📋 My Reports
            </Link>
          )}

          {profile?.role === 'admin' && (
            <Link
              to="/admin/org-accounts"
              className="mnav py-2.5 px-3 rounded-lg hover:bg-purple-50 font-bold text-sm text-purple-800"
              onClick={() => setMenuOpen(false)}
            >
              🏢 Org Accounts Admin
            </Link>
          )}

          {profile?.role !== 'org_rep' && (
            <Link
              to="/report"
              className="mnav py-2.5 px-3 rounded-lg hover:bg-[var(--bg)] font-bold text-sm text-[var(--brand)]"
              onClick={() => setMenuOpen(false)}
            >
              + Report Issue
            </Link>
          )}

          <div className="pt-3 mt-2 border-t border-[var(--line)] flex flex-col gap-2">
            {user ? (
              <>
                <div className="px-3 py-2 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center">
                    {displayName.charAt(0)}
                  </span>
                  <span>{displayName} ({roleLabel || 'USER'})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs bg-red-50/50"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  className="text-center py-2.5 rounded-xl border border-[var(--line)] text-sm font-bold text-[var(--ink)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="text-center py-2.5 rounded-xl btn-accent text-sm font-bold text-white shadow-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
