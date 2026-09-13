import { useState } from 'react'
import Reveal from '../components/Reveal.jsx'

const STEPS = [
  {
    n: 1,
    title: 'Citizen Reports Issue',
    icon: '📣',
    short: 'Crowd-sourced intake',
    desc: 'A citizen files a report with photo evidence, geolocation and category tag via web, PWA or SMS/IVR for low-bandwidth access.',
    points: ['Multi-channel intake (Web, PWA, IVR)', 'Photo + GPS + category metadata', 'Multilingual, low-bandwidth friendly'],
  },
  {
    n: 2,
    title: 'Validation',
    icon: '🛡️',
    short: 'Crowd + moderator',
    desc: 'Reports surface for community upvotes and a quick moderator check to filter spam, duplicates and mis-categorised entries.',
    points: ['Crowd upvotes surface real issues', 'Moderator duplicate / spam filter', 'Threshold triggers auto-routing'],
  },
  {
    n: 3,
    title: 'Matching Engine',
    icon: '🤝',
    short: 'Tri-party auto-route',
    desc: 'The engine matches the issue to a relevant university department for execution, a CSR/industry partner for funding, and a government department for sanctioning.',
    points: ['University dept → execution capacity', 'CSR / industry → funds under Sec 135', 'Govt dept → sanction + monitoring'],
  },
  {
    n: 4,
    title: 'Status Tracker',
    icon: '📊',
    short: 'Public lifecycle',
    desc: 'Every issue moves through Reported → Matched → Sanctioned → In Progress → Resolved on a public dashboard anyone can audit.',
    points: ['5-stage lifecycle visible to all', 'Real-time status + ETA', 'SMS / email updates to reporter'],
  },
  {
    n: 5,
    title: 'Resolved',
    icon: '✅',
    short: 'Closed & auditable',
    desc: 'Resolution is verified by the citizen who reported it, the university team and the government body — then archived as a case study.',
    points: ['Tri-party closure verification', 'Citizen feedback rating', 'Published as impact case study'],
  },
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1)
  const s = STEPS.find((x) => x.n === activeStep)

  return (
    <>
      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Reveal>
              <div>
                <div className="section-tag mb-3">How It Works</div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-3">A five-step journey from report to resolution</h2>
                <p className="text-[var(--ink-soft)]">Click any step to explore what happens behind the scenes.</p>
              </div>
            </Reveal>
          </div>

          {/* Stepper bar (desktop) */}
          <Reveal className="mb-10 hidden lg:block">
            <div className="relative">
              <div className="absolute top-7 left-0 right-0 h-1 bg-[var(--line)] rounded-full"></div>
              <div
                className="absolute top-7 left-0 h-1 bg-gradient-to-r from-[var(--brand)] to-[var(--accent)] rounded-full transition-all duration-700"
                style={{ width: `${((activeStep - 1) / 4) * 100}%` }}
              ></div>
              <div className="grid grid-cols-5 gap-4">
                {STEPS.map((step) => {
                  const isActive = step.n === activeStep
                  return (
                    <div
                      key={step.n}
                      className={`step text-center${isActive ? ' is-active' : ''}`}
                      onClick={() => setActiveStep(step.n)}
                    >
                      <div className="step-num mx-auto w-14 h-14 rounded-full bg-white border-2 border-[var(--line)] flex items-center justify-center font-bold text-[var(--ink-soft)] text-lg relative z-10">
                        {isActive ? (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span>{step.n}</span>
                        )}
                      </div>
                      <div className="step-card mt-3 rounded-xl p-2.5 text-xs font-semibold text-[var(--ink-soft)] bg-white/60">{step.title}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Reveal>

          {/* Mobile step pills */}
          <Reveal className="mb-6 overflow-x-auto -mx-5 px-5 lg:hidden">
            <div className="flex gap-2 min-w-max">
              {STEPS.map((step) => {
                const isActive = step.n === activeStep
                return (
                  <button
                    key={step.n}
                    className={`step px-3.5 py-2 rounded-full text-xs font-semibold border whitespace-nowrap${isActive ? ' is-active' : ''}`}
                    style={
                      isActive
                        ? { background: 'linear-gradient(135deg,#0d9488,#0369a1)', color: '#fff', borderColor: 'transparent' }
                        : { background: '#fff', color: '', borderColor: 'var(--line)' }
                    }
                    onClick={() => setActiveStep(step.n)}
                  >
                    {step.n}. {step.short}
                  </button>
                )
              })}
            </div>
          </Reveal>

          {/* Detail panel */}
          <div className="card p-6 lg:p-10">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand)]/10 to-[var(--accent)]/10 flex items-center justify-center text-2xl">{s.icon}</div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">Step {s.n} of 5</div>
                    <h3 className="text-xl lg:text-2xl font-bold">{s.title}</h3>
                  </div>
                </div>
                <p className="text-[var(--ink-soft)] leading-relaxed">{s.desc}</p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                    className={`btn-ghost px-4 py-2 rounded-lg text-sm font-semibold${activeStep === 1 ? ' opacity-40 pointer-events-none' : ''}`}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setActiveStep(Math.min(5, activeStep + 1))}
                    className={`btn-primary px-4 py-2 rounded-lg text-sm font-semibold${activeStep === 5 ? ' opacity-40 pointer-events-none' : ''}`}
                  >
                    Next →
                  </button>
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-3 gap-3">
                  {s.points.map((p, i) => (
                    <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
                      <div className="text-xs font-bold text-[var(--brand-deep)] mb-1">0{i + 1}</div>
                      <div className="text-sm text-[var(--ink)] font-medium leading-snug">{p}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--ink-soft)] flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                  <span>Hint: hover the steps above on desktop, or tap them to walk through the entire lifecycle of a single report.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
