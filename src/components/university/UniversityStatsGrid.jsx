import React from 'react';

export default function UniversityStatsGrid({ matches = [] }) {
  // Calculate the 6 required stats
  const assignedChallenges = matches.length;

  const pendingReviews = matches.filter(
    (m) => (m.review_status === 'pending' || !m.review_status) && m.issues?.status === 'matched'
  ).length;

  const activeProjects = matches.filter(
    (m) => m.issues?.status === 'in_progress'
  ).length;

  const awaitingApproval = matches.filter(
    (m) => m.issues?.status === 'sanctioned' || m.review_status === 'accepted'
  ).length;

  const inTesting = matches.filter(
    (m) => m.issues?.status === 'in_progress' && m.issues?.status_history?.some(h => h.outcome_type === 'pilot_test')
  ).length;

  const implementedSolutions = matches.filter(
    (m) => m.issues?.status === 'resolved'
  ).length;

  const stats = [
    {
      title: 'Assigned Challenges',
      value: assignedChallenges,
      subtitle: 'Matched by SetU-Link Engine',
      badge: '🎯 R&D Scope',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
      icon: '🏛️',
    },
    {
      title: 'Pending Reviews',
      value: pendingReviews,
      subtitle: 'Awaiting Faculty Accept/Reject',
      badge: '⏳ Action Required',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
      icon: '📋',
    },
    {
      title: 'Active Projects',
      value: activeProjects,
      subtitle: 'Student Teams In Development',
      badge: '⚡ In Progress',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-200',
      icon: '⚙️',
    },
    {
      title: 'Awaiting Approval',
      value: awaitingApproval,
      subtitle: 'Government Sanction Pending',
      badge: '🏛️ Sanction Stage',
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      icon: '📜',
    },
    {
      title: 'Projects in Testing',
      value: inTesting,
      subtitle: 'Field Pilots & Testing Phase',
      badge: '🧪 Field Trials',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-200',
      icon: '🔬',
    },
    {
      title: 'Implemented Solutions',
      value: implementedSolutions,
      subtitle: 'Deployed High-Impact Outcomes',
      badge: '🌱 Deployed Impact',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      icon: '🚀',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white/90 nav-blur rounded-3xl border border-[var(--line)] p-5 shadow-sm hover:shadow-md transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{stat.icon}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${stat.badgeColor}`}>
              {stat.badge}
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-[var(--ink)] tracking-tight">
              {stat.value}
            </div>
            <div className="text-sm font-bold text-[var(--ink-soft)] mt-0.5">
              {stat.title}
            </div>
          </div>

          <div className="text-xs text-[var(--ink-soft)] pt-2 border-t border-[var(--line)]">
            {stat.subtitle}
          </div>
        </div>
      ))}
    </div>
  );
}
