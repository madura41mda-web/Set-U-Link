import { useRef, useState } from 'react'
import Reveal from '../components/Reveal.jsx'

const STAGES = [
  { key: 'reported', label: 'Reported', icon: '📣' },
  { key: 'matched', label: 'Matched', icon: '🤝' },
  { key: 'sanctioned', label: 'Sanctioned', icon: '🏛️' },
  { key: 'inprogress', label: 'In Progress', icon: '🚧' },
  { key: 'resolved', label: 'Resolved', icon: '✅' },
]

const MATCH_DATA = {
  Education: { uni: 'NIT Ranchi — CSE Dept', csr: 'Tata Steel Foundation', gov: 'Dept. of School Education & Literacy' },
  Health: { uni: 'AIIMS Jharkhand — Community Med', csr: 'Jindal Steel & Power CSR', gov: 'Dept. of Health, Medical Education & Family Welfare' },
  Water: { uni: 'BIT Sindri — Civil / Hydraulics', csr: 'Hindustan Copper CSR', gov: 'Dept. of Drinking Water & Sanitation' },
  Sanitation: { uni: 'Ranchi University — Social Work', csr: 'NTPC Foundation', gov: 'Jharkhand Urban Development' },
  Infrastructure: { uni: 'NIT Jamshedpur — Civil', csr: 'Adani Foundation', gov: 'Jharkhand Road Construction Dept' },
}

export default function Demo() {
  const [category, setCategory] = useState('Education')
  const [location, setLocation] = useState('Ranchi, Jharkhand')
  const [description, setDescription] = useState('')
  const [running, setRunning] = useState(false)
  const [stageIndex, setStageIndex] = useState(-1)
  const [statusLines, setStatusLines] = useState([])
  const [trackId, setTrackId] = useState('— waiting —')
  const [match, setMatch] = useState(null)
  const [barResolved, setBarResolved] = useState(false)
  const timersRef = useRef([])

  // Current stage (or -1 before a report is submitted)
  const idx = stageIndex
  const pct = idx >= 0 ? Math.round((idx / STAGES.length) * 100) : 0
  const trackLabel = idx >= 0 ? STAGES[idx].label : 'Submit a report to begin'

  const statusTextFor = (cat, loc) => [
    `Filed under ${cat} • ${loc}`,
    'Matched to tri-party pipeline',
    'Govt sanction approved',
    'University team executing on ground',
    'Verified & closed by citizen',
  ]

  const [autoSimulate, setAutoSimulate] = useState(false)

  const handleSubmit = () => {
    const cat = category
    const loc = location || 'Jharkhand'
    const id = 'SL-' + Math.random().toString(36).slice(2, 7).toUpperCase()
    setTrackId(id)

    const statusText = statusTextFor(cat, loc)
    setStatusLines(statusText)
    setMatch(MATCH_DATA[cat])
    setStageIndex(0)
    setBarResolved(false)

    if (autoSimulate) {
      setRunning(true)
      const advance = (i) => {
        setStageIndex(i)
        if (i >= STAGES.length - 1) {
          setRunning(false)
          setBarResolved(true)
          return
        }
        timersRef.current.push(setTimeout(() => advance(i + 1), 1100))
      }
      advance(0)
    }
  }

  const handleManualNextStage = () => {
    if (stageIndex < STAGES.length - 1) {
      const nextIdx = stageIndex + 1
      setStageIndex(nextIdx)
      if (nextIdx === STAGES.length - 1) {
        setBarResolved(true)
      }
    }
  }

  const barClass = barResolved
    ? 'track-bar-fill h-full rounded-full'
    : 'track-bar-fill h-full w-0 rounded-full bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-[var(--accent)]'

  const barStyle = barResolved
    ? { width: '100%', background: 'linear-gradient(90deg,#16a34a,#0d9488)' }
    : { width: `${pct}%` }

  return (
    <>
      {/* ===================== INTERACTIVE DEMO ===================== */}
      <section id="demo" className="py-16 lg:py-24 relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Reveal>
              <div>
                <div className="section-tag mb-3">Interactive Demo</div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-3">Report an issue. Watch it resolve.</h2>
                <p className="text-[var(--ink-soft)]">An interactive end-to-end civic issue reporting flow.</p>
              </div>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Form */}
            <Reveal className="lg:col-span-6">
              <div className="card p-6 lg:p-8">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold">Report an Issue</h3>
                  <span className="badge bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)]">Demo Mode</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Category</label>
                    <div className="field px-3.5 py-3">
                      <select
                        className="w-full bg-transparent outline-none text-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Education">📚 Education</option>
                        <option value="Health">🏥 Health</option>
                        <option value="Water">💧 Water</option>
                        <option value="Sanitation">🧹 Sanitation</option>
                        <option value="Infrastructure">🛣️ Infrastructure</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Location</label>
                    <div className="field px-3.5 py-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z" /><circle cx="12" cy="9" r="2.5" /></svg>
                      <input
                        className="w-full bg-transparent outline-none text-sm"
                        placeholder="District / area"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <div className="field px-3.5 py-3">
                      <textarea
                        rows="2"
                        className="w-full bg-transparent outline-none text-sm resize-none"
                        placeholder="Briefly describe the issue..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Photo placeholder */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Photo evidence</label>
                    <div className="field p-0 cursor-pointer">
                      <div className="rounded-xl shimmer h-28 flex flex-col items-center justify-center text-[var(--ink-soft)] text-sm">
                        <svg className="w-6 h-6 mb-1 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13" r="3.5" /></svg>
                        <span>Tap to attach a photo (placeholder)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                    <span className="text-xs font-bold text-[var(--ink)]">Auto-Simulate All Stages</span>
                    <input
                      type="checkbox"
                      checked={autoSimulate}
                      onChange={(e) => setAutoSimulate(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[var(--brand)]"
                    />
                  </div>

                  <button
                    className="btn-primary w-full py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                    onClick={handleSubmit}
                  >
                    Submit Report & Start Tracker
                    <svg className="w-4 h-4" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>

                  {stageIndex >= 0 && !autoSimulate && stageIndex < STAGES.length - 1 && (
                    <button
                      onClick={handleManualNextStage}
                      className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer text-xs"
                    >
                      ⚡ Advance to Next Stage ({STAGES[stageIndex + 1]?.label}) →
                    </button>
                  )}

                  <p className="text-xs text-center text-[var(--ink-soft)] font-medium">
                    💡 In the live portal, stage progression requires manual verification & action by assigned University Mentors and Industry Reps on their dashboard.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Tracker */}
            <Reveal delay={2} className="lg:col-span-6">
              <div className="card p-6 lg:p-8 h-full">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold">Status Tracker</h3>
                  <span className="badge bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] font-mono">{trackId}</span>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-xs font-medium text-[var(--ink-soft)] mb-1.5">
                    <span>{trackLabel}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className={barClass} style={barStyle}></div>
                    </div>
                </div>

                <div className="space-y-5">
                  {STAGES.map((s, i) => {
                    const dotState = i < idx ? 'done' : i === idx ? 'current' : ''
                    const detail =
                      i <= idx && statusLines[i]
                        ? statusLines[i]
                        : i === idx
                          ? 'In progress…'
                          : i < idx
                            ? 'Completed'
                            : 'Pending…'
                    return (
                      <div key={s.key} className="track-row flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`track-dot mt-1${dotState ? ` ${dotState}` : ''}`}></div>
                          <div className="w-0.5 flex-1 bg-[var(--line)] min-h-[28px]"></div>
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{s.icon}</span>
                            <span className="font-semibold text-[var(--ink)]">{s.label}</span>
                          </div>
                          <div
                            className="text-sm mt-0.5"
                            style={{ color: i < idx ? 'var(--good)' : i === idx ? 'var(--accent)' : 'var(--ink-soft)' }}
                          >
                            {detail}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {match && (
                  <div className="mt-6">
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)] mb-3">Auto-Match Engine</div>
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white rounded-lg p-3 border border-[var(--line)]">
                          <div className="text-xs text-[var(--ink-soft)]">University Dept</div>
                          <div className="font-semibold mt-0.5">{match.uni}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-[var(--line)]">
                          <div className="text-xs text-[var(--ink-soft)]">CSR / Industry</div>
                          <div className="font-semibold mt-0.5">{match.csr}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-[var(--line)]">
                          <div className="text-xs text-[var(--ink-soft)]">Govt Dept</div>
                          <div className="font-semibold mt-0.5">{match.gov}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
