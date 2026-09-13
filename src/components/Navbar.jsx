import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'How it Works', to: '/how-it-works' },
  { label: 'Demo', to: '/demo' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Impact', to: '/impact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      id="nav"
      className="fixed top-0 left-0 right-0 z-50 nav-blur bg-white/70 border-b border-[var(--line)]"
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
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[var(--ink-soft)]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link hover:text-[var(--ink)]${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/team"
            className="nav-link hover:text-[var(--ink)]"
          >
            Team
          </NavLink>
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/demo" className="btn-accent text-sm font-semibold px-4 py-2 rounded-xl">Report an Issue</Link>
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
      <div id="mobileMenu" className={`mobile-menu lg:hidden bg-white border-t border-[var(--line)]${menuOpen ? ' open' : ''}`}>
        <div className="px-5 py-4 flex flex-col gap-1 text-[var(--ink-soft)]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="mnav py-2.5 px-3 rounded-lg hover:bg-[var(--bg)]"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/team"
            className="mnav py-2.5 px-3 rounded-lg hover:bg-[var(--bg)]"
            onClick={() => setMenuOpen(false)}
          >
            Team
          </Link>
          <Link
            to="/demo"
            className="mnav mt-2 text-center btn-accent text-sm font-semibold px-4 py-2.5 rounded-xl text-white"
            onClick={() => setMenuOpen(false)}
          >
            Report an Issue
          </Link>
        </div>
      </div>
    </header>
  )
}
