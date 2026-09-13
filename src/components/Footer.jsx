import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer id="team" className="pt-16 lg:pt-24 pb-10 border-t border-[var(--line)] bg-white/60">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white font-extrabold shadow-md">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18 14 8l6 6" />
                  <circle cx="6" cy="18" r="2" />
                  <circle cx="14" cy="8" r="2" />
                  <circle cx="20" cy="14" r="2" />
                </svg>
              </span>
              <div className="font-extrabold text-lg">SetuLink</div>
            </div>
            <p className="text-sm text-[var(--ink-soft)] max-w-md leading-relaxed">
              A civic-tech bridge from complaint to resolution — built for Smart India Hackathon 2026, Problem Statement SIH26043.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="badge bg-[var(--brand)]/10 text-[var(--brand-deep)]">Team Pre-coderz</span>
              <span className="badge bg-[var(--accent)]/10 text-[var(--accent)]">Team ID: GAT030</span>
              <span className="badge bg-white border border-[var(--line)] text-[var(--ink-soft)]">SIH 2026</span>
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-4">Navigate</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-[var(--brand)] transition">Home</Link></li>
              <li><Link to="/how-it-works" className="hover:text-[var(--brand)] transition">How it Works</Link></li>
              <li><Link to="/demo" className="hover:text-[var(--brand)] transition">Demo</Link></li>
              <li><Link to="/dashboard" className="hover:text-[var(--brand)] transition">Dashboard</Link></li>
              <li><Link to="/impact" className="hover:text-[var(--brand)] transition">Impact</Link></li>
            </ul>
          </div>
          <div className="lg:col-span-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-4">Reference Links</div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="https://www.mca.gov.in/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-[var(--brand)] transition">
                  <span className="text-[var(--brand)]">↗</span> Companies Act, Section 135 (CSR)
                </a>
              </li>
              <li>
                <a href="https://pgportal.gov.in/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-[var(--brand)] transition">
                  <span className="text-[var(--brand)]">↗</span> CPGRAMS — Centralized Grievance Portal
                </a>
              </li>
              <li>
                <a href="https://www.mygov.in/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-[var(--brand)] transition">
                  <span className="text-[var(--brand)]">↗</span> MyGov Jharkhand
                </a>
              </li>
              <li>
                <a href="https://pgms.jharkhand.gov.in/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-[var(--brand)] transition">
                  <span className="text-[var(--brand)]">↗</span> Jharkhand PGMS
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--ink-soft)]">
          <div>© 2026 SetuLink — Team Pre-coderz (GAT030). Built for Smart India Hackathon 2026.</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--good)] animate-pulse"></span>
            Prototype — concept demo only
          </div>
        </div>
      </div>
    </footer>
  )
}
