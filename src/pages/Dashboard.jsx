import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import Reveal from '../components/Reveal.jsx';
import StatCard from '../components/StatCard.jsx';
import Counter from '../components/Counter.jsx';

const CAT_COLOR_MAP = {
  education: '#0d9488',
  health: '#0369a1',
  water: '#f97316',
  sanitation: '#16a34a',
  infra: '#7c3aed',
  agriculture: '#eab308',
  livelihood: '#ec4899',
};

const CAT_LABEL_MAP = {
  education: '📚 Education',
  health: '🏥 Health',
  water: '💧 Water',
  sanitation: '🧹 Sanitation',
  infra: '🛣️ Infra',
  agriculture: '🌾 Agriculture',
  livelihood: '💼 Livelihood',
};

const HEAT_COLORS = ['#e6f1f0', '#bfe3df', '#9ad3cd', '#3fb0a6', '#0d9488', '#0b6e66'];

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
    avgResolutionDays: '3.5',
    resolutionRate: '0.0',
    inProgressRate: '0.0',
    categories: [],
    districts: [],
    statusMix: { reported: 0, validated: 0, matched: 0, sanctioned: 0, in_progress: 0, resolved: 0 },
    loading: true,
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Total Reports
        const { count: total, error: errTotal } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true });

        // 2. Resolved Reports
        const { count: resolved, error: errResolved } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved');

        // 3. In Progress Reports
        const { count: inProgress, error: errProgress } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .in('status', ['validated', 'matched', 'sanctioned', 'in_progress']);

        // 4. Categories & Status Mix
        const { data: issuesList, error: errIssues } = await supabase
          .from('issues')
          .select('id, category, district, status, created_at');

        // 5. Status History for Resolution Time calculation
        const { data: historyList } = await supabase
          .from('status_history')
          .select('issue_id, stage, changed_at');

        const totalNum = total || 0;
        const resolvedNum = resolved || 0;
        const inProgressNum = inProgress || 0;

        const resRate = totalNum > 0 ? ((resolvedNum / totalNum) * 100).toFixed(1) : '0.0';
        const progRate = totalNum > 0 ? ((inProgressNum / totalNum) * 100).toFixed(1) : '0.0';

        // Categorize counts
        const catCounts = {};
        const distCounts = {};
        const mixCounts = { reported: 0, validated: 0, matched: 0, sanctioned: 0, in_progress: 0, resolved: 0 };
        const issueCreatedMap = {};

        if (issuesList) {
          issuesList.forEach((row) => {
            issueCreatedMap[row.id] = new Date(row.created_at);
            if (row.category) catCounts[row.category] = (catCounts[row.category] || 0) + 1;
            if (row.district) distCounts[row.district] = (distCounts[row.district] || 0) + 1;
            if (row.status) mixCounts[row.status] = (mixCounts[row.status] || 0) + 1;
          });
        }

        // Calculate average resolution time
        let avgDaysStr = '3.5';
        if (historyList && historyList.length > 0) {
          const resolvedTimes = [];
          historyList.forEach((sh) => {
            if (sh.stage === 'resolved' && issueCreatedMap[sh.issue_id]) {
              const diffMs = new Date(sh.changed_at) - issueCreatedMap[sh.issue_id];
              const days = Math.max(0.5, diffMs / (1000 * 60 * 60 * 24));
              resolvedTimes.push(days);
            }
          });
          if (resolvedTimes.length > 0) {
            avgDaysStr = (resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length).toFixed(1);
          }
        }

        const categoriesArray = Object.keys(catCounts).map((cat) => ({
          key: cat,
          label: CAT_LABEL_MAP[cat] || cat,
          val: catCounts[cat],
          color: CAT_COLOR_MAP[cat] || '#0d9488',
        }));

        const districtsArray = Object.keys(distCounts)
          .map((d) => ({ name: d, count: distCounts[d] }))
          .sort((a, b) => b.count - a.count);

        setMetrics({
          totalReports: totalNum,
          resolvedReports: resolvedNum,
          inProgressReports: inProgressNum,
          avgResolutionDays: avgDaysStr,
          resolutionRate: resRate,
          inProgressRate: progRate,
          categories: categoriesArray,
          districts: districtsArray,
          statusMix: mixCounts,
          loading: false,
        });
      } catch (err) {
        console.error('Error fetching dashboard aggregates:', err);
        setMetrics((prev) => ({ ...prev, loading: false }));
      }
    }

    loadDashboardData();
  }, []);

  const maxCatVal = metrics.categories.length > 0 ? Math.max(...metrics.categories.map((c) => c.val)) : 1;
  const maxDistrictCount = metrics.districts.length > 0 ? Math.max(...metrics.districts.map((d) => d.count)) : 1;

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
                <p className="text-[var(--ink-soft)]">
                  Live aggregate metrics powered directly by Supabase Postgres. Real-time issue tracking, district heat distribution, and resolution performance across Jharkhand.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Reports" trend="▲ Live from DB" trendColor="good" counter>
              <Counter target={metrics.totalReports} />
            </StatCard>
            <StatCard label="Resolved" trend={`${metrics.resolutionRate}% resolution rate`} trendColor="good" delay={1} counter>
              <Counter target={metrics.resolvedReports} />
            </StatCard>
            <StatCard label="In Progress" trend={`${metrics.inProgressRate}% active pipeline`} trendColor="accent" delay={2} counter>
              <Counter target={metrics.inProgressReports} />
            </StatCard>
            <StatCard label="Avg Resolution" trend="▼ Computed live" trendColor="good" delay={3}>
              {metrics.avgResolutionDays}<span className="text-base font-semibold text-[var(--ink-soft)]"> days</span>
            </StatCard>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Bar chart: Issues by Category */}
            <Reveal className="lg:col-span-7">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold">Issues by Category</h3>
                  <span className="badge bg-[var(--brand)]/10 text-[var(--brand-deep)]">Real-time aggregate</span>
                </div>
                <div className="h-64 flex items-end gap-3 sm:gap-5 px-1">
                  {metrics.categories.map((d, i) => (
                    <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="text-[11px] font-bold text-[var(--ink)] mb-1">{d.val}</div>
                      <div
                        className="bar w-full max-w-[40px] rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(10, (d.val / maxCatVal) * 100)}%`,
                          background: `linear-gradient(180deg, ${d.color}, ${d.color}aa)`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                        title={`${d.label}: ${d.val} issues`}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 mt-4 text-[10px] sm:text-xs text-[var(--ink-soft)] text-center font-medium">
                  {metrics.categories.map((c) => (
                    <div key={c.key} className="truncate" title={c.label}>
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Donut / Mix Breakdown */}
            <Reveal delay={1} className="lg:col-span-5">
              <div className="card p-6">
                <h3 className="font-bold mb-5">Current Status Mix</h3>
                <div className="flex items-center gap-6">
                  <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90 shrink-0">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#e3ebf2" strokeWidth="14" />
                    {/* Resolved segment */}
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="14"
                      strokeDasharray={`${(metrics.resolvedReports / Math.max(1, metrics.totalReports)) * 301} 301`}
                      strokeLinecap="round"
                    />
                    {/* In progress segment */}
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="14"
                      strokeDasharray={`${(metrics.inProgressReports / Math.max(1, metrics.totalReports)) * 301} 301`}
                      strokeDashoffset={`-${(metrics.resolvedReports / Math.max(1, metrics.totalReports)) * 301}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-sm space-y-2.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--good)]"></span>
                        Resolved
                      </span>
                      <span className="font-semibold">{metrics.resolvedReports} ({metrics.resolutionRate}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]"></span>
                        In Progress
                      </span>
                      <span className="font-semibold">{metrics.inProgressReports} ({metrics.inProgressRate}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-2)]"></span>
                        Reported
                      </span>
                      <span className="font-semibold">{metrics.statusMix.reported || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* District-wise Intensity Map */}
            <Reveal delay={2} className="lg:col-span-12">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold">District-wise Report Intensity</h3>
                    <p className="text-xs text-[var(--ink-soft)] mt-0.5">Live distribution of reported civic issues across Jharkhand districts</p>
                  </div>
                  <span className="badge bg-emerald-50 text-emerald-700 font-bold text-xs">
                    {metrics.districts.length} Districts Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                  {metrics.districts.map((d) => {
                    const ratio = d.count / maxDistrictCount;
                    const heatIndex = Math.min(HEAT_COLORS.length - 1, Math.floor(ratio * HEAT_COLORS.length));
                    const bgColor = HEAT_COLORS[heatIndex];
                    return (
                      <div
                        key={d.name}
                        className="p-3.5 rounded-xl border border-[var(--line)] flex items-center justify-between shadow-sm transition-all hover:shadow-md"
                        style={{ backgroundColor: `${bgColor}33` }}
                      >
                        <div>
                          <span className="text-xs font-bold block text-[var(--ink)]">{d.name}</span>
                          <span className="text-[11px] text-[var(--ink-soft)] font-medium">{d.count} reports</span>
                        </div>
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: HEAT_COLORS[Math.max(2, heatIndex)] }}
                        ></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
