import Reveal from '../components/Reveal.jsx'

const TECH_BADGES = [
  '⚛️ React.js',
  '📱 PWA',
  '🟢 Node.js / Django',
  '🐘 PostgreSQL + PostGIS',
  '☁️ AWS / Azure Govt Cloud',
  '📞 SMS / IVR Gateway',
  '🗺️ Geospatial Routing',
]

export default function Impact() {
  return (
    <>
      {/* ===================== WHO BENEFITS ===================== */}
      <section id="impact" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Reveal>
              <div>
                <div className="section-tag mb-3">Who Benefits</div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-3">One platform. Four winners.</h2>
              </div>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Reveal className="card p-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center text-2xl mb-4">👥</div>
              <h3 className="font-bold mb-1.5">Citizens</h3>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">A voice that's actually heard — every report routed, tracked and publicly closed, not lost in a portal.</p>
            </Reveal>
            <Reveal delay={1} className="card p-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-2)]/10 flex items-center justify-center text-2xl mb-4">🎓</div>
              <h3 className="font-bold mb-1.5">Students & Universities</h3>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">Real, funded problem statements to solve — live field projects with measurable social impact.</p>
            </Reveal>
            <Reveal delay={2} className="card p-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-2xl mb-4">🏭</div>
              <h3 className="font-bold mb-1.5">Industry / CSR</h3>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">A pipeline of vetted, government-aligned CSR opportunities under Companies Act Sec 135.</p>
            </Reveal>
            <Reveal delay={3} className="card p-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--good)]/10 flex items-center justify-center text-2xl mb-4">🏛️</div>
              <h3 className="font-bold mb-1.5">Government</h3>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">Crowd-sourced ground truth plus academic + industry execution capacity — without extra budget.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== TECH STACK ===================== */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <Reveal>
            <div className="card p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="lg:w-1/4">
                  <div className="section-tag mb-2">Built With</div>
                  <h3 className="text-xl font-bold">Modern, scalable, government-ready stack</h3>
                </div>
                <div className="lg:w-3/4 overflow-hidden relative">
                  <div className="flex gap-3 marquee w-max">
                    {/* duplicated for seamless loop */}
                    <div className="flex gap-3">
                      {TECH_BADGES.map((badge) => (
                        <span key={badge} className="tech-badge">{badge}</span>
                      ))}
                    </div>
                    <div className="flex gap-3" aria-hidden="true">
                      {TECH_BADGES.map((badge) => (
                        <span key={badge} className="tech-badge">{badge}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== INNOVATION CALLOUT ===================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <Reveal>
            <div
              className="relative rounded-3xl overflow-hidden p-8 lg:p-14 text-white"
              style={{ background: 'linear-gradient(135deg,#0b3a52 0%,#0d9488 45%,#0369a1 100%)' }}
            >
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[var(--accent)]/30 blur-3xl"></div>
              <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl"></div>
              <div className="relative grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8">
                  <div className="badge bg-white/15 text-white mb-4">Why SetuLink is different</div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4">A complaint forum ends at "submitted". SetuLink ends at "resolved".</h2>
                  <p className="text-white/85 leading-relaxed max-w-2xl">We add the missing three layers — <strong>matching</strong> to the right university department, <strong>sanctioning</strong> through a government body, and <strong>tracking</strong> on a public dashboard — turning a stray complaint into a funded, mentored, government-approved project that actually gets delivered.</p>
                  <div className="grid sm:grid-cols-3 gap-4 mt-7">
                    <div className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/15">
                      <div className="text-2xl font-extrabold">3x</div>
                      <div className="text-sm text-white/80">matching parties per issue</div>
                    </div>
                    <div className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/15">
                      <div className="text-2xl font-extrabold">5</div>
                      <div className="text-sm text-white/80">lifecycle stages tracked</div>
                    </div>
                    <div className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/15">
                      <div className="text-2xl font-extrabold">100%</div>
                      <div className="text-sm text-white/80">publicly auditable</div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 flex justify-center">
                  <svg viewBox="0 0 200 200" className="w-48 h-48 lg:w-56 lg:h-56">
                    <defs>
                      <linearGradient id="ring" x1="0" x2="1">
                        <stop offset="0" stopColor="#f97316" />
                        <stop offset="1" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="14" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="url(#ring)" strokeWidth="14" strokeLinecap="round" strokeDasharray="380 503" transform="rotate(-90 100 100)" />
                    <text x="100" y="92" textAnchor="middle" fontSize="13" fill="#fff" opacity=".8">resolution</text>
                    <text x="100" y="112" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">75%</text>
                  </svg>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
