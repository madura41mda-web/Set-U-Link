import { useState } from 'react'
import Reveal from '../components/Reveal.jsx'
import StatCard from '../components/StatCard.jsx'
import Counter from '../components/Counter.jsx'

const CAT_DATA = [
  { label: 'Education', val: 840, color: '#0d9488' },
  { label: 'Health', val: 620, color: '#0369a1' },
  { label: 'Water', val: 540, color: '#f97316' },
  { label: 'Sanitation', val: 470, color: '#16a34a' },
  { label: 'Infra', val: 657, color: '#7c3aed' },
]

const HEAT_COLORS = ['#e6f1f0', '#bfe3df', '#9ad3cd', '#3fb0a6', '#0d9488', '#0b6e66']
const HEAT_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// 7 cols (days) x 6 rows (districts), same random-fill behaviour as the demo
function buildHeatCells() {
  const cells = []
  for (let i = 0; i < 7 * 6; i++) {
    const v = Math.floor(Math.random() * HEAT_COLORS.length)
    cells.push({
      id: i,
      color: HEAT_COLORS[v],
      title: `${HEAT_LABELS[i % 7]} • intensity ${v + 1}/6`,
    })
  }
  return cells
}

export default function Dashboard() {
  // Bar chart heights derived from CAT_DATA
  const maxVal = Math.max(...CAT_DATA.map((d) => d.val))

  // Randomize once per mount (matches the demo's per-page-load fill)
  const [heatCells] = useState(buildHeatCells)

  return (
    <>
      {/* ===================== DASHBOARD ===================== */}
      <section id="dashboard" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Reveal>
              <div>
                <div className="section-tag mb-3">Public Dashboard</div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-3">Transparency, in real time</h2>
                <p className="text-[var(--ink-soft)]">An open API powers a public dashboard with live resolution metrics, district-wise heat indicators and average resolution-time trends.</p>
              </div>
            </Reveal>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Reports" trend="▲ 12% this month" trendColor="good" counter>
              <Counter target={4826} />
            </StatCard>
            <StatCard label="Resolved" trend="64.8% resolution rate" trendColor="good" delay={1} counter>
              <Counter target={3127} />
            </StatCard>
            <StatCard label="In Progress" trend="24.5% pipeline" trendColor="accent" delay={2} counter>
              <Counter target={1184} />
            </StatCard>
            <StatCard label="Avg Resolution" trend="▼ 3.1 days vs last qtr" trendColor="good" delay={3}>
              14.3<span className="text-base font-semibold text-[var(--ink-soft)]"> days</span>
            </StatCard>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Bar chart: resolved by category */}
            <Reveal className="lg:col-span-7">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold">Issues Resolved by Category</h3>
                  <span className="badge bg-[var(--brand)]/10 text-[var(--brand-deep)]">Last 90 days</span>
                </div>
                <div className="h-64 flex items-end gap-4 sm:gap-6 px-1">
                  {CAT_DATA.map((d, i) => (
                    <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="text-[10px] font-semibold text-[var(--ink-soft)] mb-1">{d.val}</div>
                      <div
                        className="bar w-full max-w-[44px] rounded-t-md"
                        style={{
                          height: `${(d.val / maxVal) * 100}%`,
                          background: `linear-gradient(180deg,${d.color},${d.color}aa)`,
                          animationDelay: `${i * 0.12}s`,
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2 mt-3 text-[10px] sm:text-xs text-[var(--ink-soft)] text-center font-medium">
                  <div>📚 Education</div><div>🏥 Health</div><div>💧 Water</div><div>🧹 Sanitation</div><div>🛣️ Infra</div>
                </div>
              </div>
            </Reveal>

            {/* Donut: status mix */}
            <Reveal delay={1} className="lg:col-span-5">
              <div className="card p-6">
                <h3 className="font-bold mb-5">Current Status Mix</h3>
                <div className="flex items-center gap-6">
                  <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#e3ebf2" strokeWidth="14" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#16a34a" strokeWidth="14" strokeDasharray="196 301" strokeLinecap="round" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#f97316" strokeWidth="14" strokeDasharray="74 301" strokeDashoffset="-196" strokeLinecap="round" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#0369a1" strokeWidth="14" strokeDasharray="31 301" strokeDashoffset="-270" strokeLinecap="round" />
                  </svg>
                  <div className="text-sm space-y-2.5 flex-1">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--good)]"></span>Resolved</span><span className="font-semibold">65%</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]"></span>In Progress</span><span className="font-semibold">25%</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-2)]"></span>Sanctioned</span><span className="font-semibold">10%</span></div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Line chart: resolution time trend */}
            <Reveal delay={2} className="lg:col-span-7">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold">Avg Resolution Time Trend</h3>
                  <span className="badge bg-[var(--accent)]/10 text-[var(--accent)]">days per issue</span>
                </div>
                <svg viewBox="0 0 500 200" className="w-full h-auto">
                  <defs>
                    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#0d9488" stopOpacity=".35" />
                      <stop offset="1" stopColor="#0d9488" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* grid */}
                  <g stroke="#e3ebf2" strokeWidth="1">
                    <line x1="0" y1="40" x2="500" y2="40" />
                    <line x1="0" y1="90" x2="500" y2="90" />
                    <line x1="0" y1="140" x2="500" y2="140" />
                  </g>
                  <path d="M0 60 L83 78 L166 70 L250 95 L333 110 L416 128 L500 150" fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M0 60 L83 78 L166 70 L250 95 L333 110 L416 128 L500 150 L500 200 L0 200 Z" fill="url(#area)" />
                  <g fill="#0d9488">
                    <circle cx="0" cy="60" r="4" /><circle cx="83" cy="78" r="4" /><circle cx="166" cy="70" r="4" /><circle cx="250" cy="95" r="4" /><circle cx="333" cy="110" r="4" /><circle cx="416" cy="128" r="4" /><circle cx="500" cy="150" r="4" />
                  </g>
                  <g fontSize="10" fill="#64748b" textAnchor="middle">
                    <text x="0" y="195">Jan</text><text x="83" y="195">Feb</text><text x="166" y="195">Mar</text><text x="250" y="195">Apr</text><text x="333" y="195">May</text><text x="416" y="195">Jun</text><text x="500" y="195">Jul</text>
                  </g>
                </svg>
                <div className="text-xs text-[var(--ink-soft)] mt-1">Trend shows steady improvement as more departments onboard.</div>
              </div>
            </Reveal>

            {/* Heat indicators */}
            <Reveal delay={3} className="lg:col-span-5">
              <div className="card p-6">
                <h3 className="font-bold mb-1">District-wise Report Intensity</h3>
                <p className="text-xs text-[var(--ink-soft)] mb-4">Darker cells = more active reports</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {heatCells.map((cell) => (
                    <div key={cell.id} className="heat" style={{ background: cell.color, height: '28px' }} title={cell.title}></div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--ink-soft)]">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <span className="w-5 h-3 rounded heat" style={{ background: '#e6f1f0' }}></span>
                    <span className="w-5 h-3 rounded heat" style={{ background: '#9ad3cd' }}></span>
                    <span className="w-5 h-3 rounded heat" style={{ background: '#3fb0a6' }}></span>
                    <span className="w-5 h-3 rounded heat" style={{ background: '#0d9488' }}></span>
                    <span className="w-5 h-3 rounded heat" style={{ background: '#0b6e66' }}></span>
                  </div>
                  <span>More</span>
                </div>
                <div className="mt-4 text-xs text-[var(--ink-soft)]">Top districts: <strong className="text-[var(--ink)]">Ranchi</strong>, Dhanbad, Bokaro, Hazaribagh, Jamshedpur.</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
