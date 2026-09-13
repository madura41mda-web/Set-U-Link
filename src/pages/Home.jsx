import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'

export default function Home() {
  return (
    <>
      {/* ===================== HERO ===================== */}
      <section id="home" className="pt-28 pb-20 lg:pt-36 lg:pb-28 relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="badge bg-[var(--brand)]/10 text-[var(--brand-deep)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]"></span>SIH 2026 • PS26043</span>
              <span className="badge bg-[var(--accent)]/10 text-[var(--accent)]">Theme: Smart Education</span>
              <span className="badge bg-white border border-[var(--line)] text-[var(--ink-soft)]">Team Pre-coderz</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] mb-5">
              From <span className="grad-text">Complaint</span> to <span className="grad-text">Resolution</span>.
            </h1>
            <p className="text-lg text-[var(--ink-soft)] max-w-xl mb-8 leading-relaxed">
              SetuLink is a civic-tech bridge that turns community-reported challenges into funded, mentored, government-approved projects — by auto-matching every issue to a university department, an industry/CSR partner, and a sanctioning government body.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/demo" className="btn-primary px-6 py-3.5 rounded-xl font-semibold inline-flex items-center gap-2">
                Report an Issue
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <Link to="/how-it-works" className="btn-ghost px-6 py-3.5 rounded-xl font-semibold inline-flex items-center gap-2">
                See it in action
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 5v14l11-7z" /></svg>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-[var(--ink-soft)]">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--good)]"></span>5-stage lifecycle tracking</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--brand)]"></span>Tri-party auto-matching</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>Open public dashboard</div>
            </div>
          </Reveal>

          {/* Hero Flow Illustration */}
          <Reveal delay={2} className="relative">
            <div className="card p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--accent)]/10 blur-2xl"></div>
              <svg viewBox="0 0 520 360" className="w-full h-auto relative">
                <defs>
                  <linearGradient id="lg1" x1="0" x2="1">
                    <stop offset="0" stopColor="#0d9488" />
                    <stop offset="1" stopColor="#0369a1" />
                  </linearGradient>
                  <linearGradient id="lg2" x1="0" x2="1">
                    <stop offset="0" stopColor="#0369a1" />
                    <stop offset="1" stopColor="#f97316" />
                  </linearGradient>
                  <linearGradient id="lg3" x1="0" x2="1">
                    <stop offset="0" stopColor="#f97316" />
                    <stop offset="1" stopColor="#16a34a" />
                  </linearGradient>
                </defs>

                {/* connecting lines */}
                <path className="flow-line" d="M110 90 C 180 90, 200 180, 270 180" fill="none" stroke="url(#lg1)" strokeWidth="2.5" strokeLinecap="round" />
                <path className="flow-line d2" d="M270 180 C 340 180, 360 90, 430 90" fill="none" stroke="url(#lg2)" strokeWidth="2.5" strokeLinecap="round" />
                <path className="flow-line d2" d="M270 180 C 340 180, 360 270, 430 270" fill="none" stroke="url(#lg3)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Citizen */}
                <g className="float">
                  <circle cx="110" cy="90" r="44" fill="#ffffff" stroke="#e3ebf2" strokeWidth="1.5" />
                  <circle cx="110" cy="80" r="11" fill="#0d9488" />
                  <path d="M92 108 q18 -16 36 0" fill="#0d9488" />
                </g>
                <text x="110" y="158" textAnchor="middle" className="font-semibold" fontSize="13" fill="#0b1f33">Citizen</text>

                {/* University */}
                <g className="float d2">
                  <circle cx="270" cy="180" r="50" fill="#ffffff" stroke="#e3ebf2" strokeWidth="1.5" />
                  <path d="M248 170 l22 -10 l22 10 l-22 10 z" fill="#0369a1" />
                  <path d="M255 180 v12 M265 180 v12 M275 180 v12 M285 180 v12" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M246 192 h48" stroke="#0369a1" strokeWidth="3" strokeLinecap="round" />
                </g>
                <text x="270" y="252" textAnchor="middle" className="font-semibold" fontSize="13" fill="#0b1f33">University Dept</text>

                {/* Industry / CSR */}
                <g className="float d3">
                  <circle cx="430" cy="90" r="44" fill="#ffffff" stroke="#e3ebf2" strokeWidth="1.5" />
                  <rect x="412" y="78" width="36" height="24" rx="2" fill="#f97316" />
                  <path d="M412 84 h36 M418 84 v-6 M432 84 v-6" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                </g>
                <text x="430" y="158" textAnchor="middle" className="font-semibold" fontSize="13" fill="#0b1f33">Industry / CSR</text>

                {/* Government */}
                <g className="float d3">
                  <circle cx="430" cy="270" r="44" fill="#ffffff" stroke="#e3ebf2" strokeWidth="1.5" />
                  <path d="M414 282 h32 M416 282 v-12 M424 282 v-12 M432 282 v-12 M440 282 v-12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M410 270 h40 l-20 -12 z" fill="#16a34a" />
                </g>
                <text x="430" y="338" textAnchor="middle" className="font-semibold" fontSize="13" fill="#0b1f33">Government</text>

                {/* pulse dots on paths */}
                <circle cx="190" cy="135" r="6" fill="#0d9488" className="pulse" />
                <circle cx="350" cy="135" r="6" fill="#f97316" className="pulse" />
                <circle cx="350" cy="225" r="6" fill="#16a34a" className="pulse" />
              </svg>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--ink-soft)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse"></span>
                Issue auto-routes through a tri-party match in seconds
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== PROBLEM STATEMENT ===================== */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <Reveal>
            <div className="card p-7 lg:p-10 grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4">
                <div className="section-tag mb-3">Problem Statement</div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-3">PS26043 — Societal Challenges, Crowd-routed.</h2>
                <div className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                  <svg className="w-4 h-4 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></svg>
                  Theme: Smart Education
                </div>
              </div>
              <div className="lg:col-span-8 text-[var(--ink-soft)] leading-relaxed">
                <p className="mb-4">Most civic-complaint apps stop at "we logged it." SetuLink closes the <strong className="text-[var(--ink)]">crowdsource → execute</strong> gap by routing every verified local challenge — education, health, water, sanitation — through a structured tri-party pipeline.</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                    <div className="text-2xl mb-1">📣</div>
                    <div className="font-semibold text-[var(--ink)] text-sm">Crowdsource</div>
                    <div className="text-xs mt-1">Citizens report with photo + location + category</div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                    <div className="text-2xl mb-1">🤝</div>
                    <div className="font-semibold text-[var(--ink)] text-sm">Partner</div>
                    <div className="text-xs mt-1">University + industry/CSR adopt the issue</div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                    <div className="text-2xl mb-1">✅</div>
                    <div className="font-semibold text-[var(--ink)] text-sm">Sanction</div>
                    <div className="text-xs mt-1">Government dept funds & monitors it</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
