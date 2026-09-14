import { useMemo } from 'react';

const VISUAL_STAGES = [
  { key: 'reported', dbStages: ['reported', 'validated'], label: 'Reported', icon: '📣', description: 'Issue submitted & validated by community' },
  { key: 'matched', dbStages: ['matched'], label: 'Matched', icon: '🤝', description: 'Routed to tri-party resolution pipeline' },
  { key: 'sanctioned', dbStages: ['sanctioned'], label: 'Sanctioned', icon: '🏛️', description: 'Govt & CSR funding approved' },
  { key: 'in_progress', dbStages: ['in_progress'], label: 'In Progress', icon: '🚧', description: 'On-ground implementation active' },
  { key: 'resolved', dbStages: ['resolved'], label: 'Resolved', icon: '✅', description: 'Verified & closed' },
];

const STAGE_WEIGHT = {
  reported: 0,
  validated: 0,
  matched: 1,
  sanctioned: 2,
  in_progress: 3,
  resolved: 4,
};

const ROLE_BADGES = {
  university: { label: 'University Partner', style: 'bg-blue-50 text-blue-800 border-blue-200' },
  industry: { label: 'Industry / CSR', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  govt: { label: 'Government Agency', style: 'bg-amber-50 text-amber-800 border-amber-200' },
};

export default function StatusTracker({ status = 'reported', statusHistory = [], matches = [] }) {
  const safeHistory = Array.isArray(statusHistory) ? statusHistory : [];
  const safeMatches = Array.isArray(matches) ? matches : [];

  // Determine current active stage index (0 to 4)
  const currentStageIndex = useMemo(() => {
    return STAGE_WEIGHT[status] ?? 0;
  }, [status]);

  const progressPercent = Math.round((currentStageIndex / (VISUAL_STAGES.length - 1)) * 100);

  // Helper to find timestamp for a visual stage from statusHistory
  const getStageTimestamp = (visualStage) => {
    const matchingRow = safeHistory
      .filter((h) => visualStage.dbStages.includes(h.stage))
      .sort((a, b) => new Date(b.changed_at || 0) - new Date(a.changed_at || 0))[0];

    if (matchingRow && matchingRow.changed_at) {
      return new Date(matchingRow.changed_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      {/* Progress Bar Header */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-2">
          <span>Lifecycle Progress</span>
          <span className="font-mono font-extrabold text-[var(--brand)]">{progressPercent}% Completed</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--line)] overflow-hidden p-0.5">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="space-y-4">
        {VISUAL_STAGES.map((s, i) => {
          const isDone = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;

          const timestamp = getStageTimestamp(s);

          let dotClass = 'bg-gray-200 border-gray-300 text-gray-400';
          let titleClass = 'text-gray-400 font-medium';
          let statusText = 'Pending...';
          let statusTextClass = 'text-gray-400';

          const primaryOrgName = safeMatches[0]?.organizations?.name || safeMatches[0]?.org?.name || null;

          if (isDone) {
            dotClass = 'bg-emerald-500 border-emerald-600 text-white shadow-sm';
            titleClass = 'text-[var(--ink)] font-bold';
            if (s.key === 'matched' && primaryOrgName) {
              statusText = timestamp ? `Matched with ${primaryOrgName} on ${timestamp}` : `Matched with ${primaryOrgName}`;
            } else if (s.key === 'in_progress' && primaryOrgName) {
              statusText = timestamp ? `Accepted & In Progress by ${primaryOrgName} on ${timestamp}` : `Accepted by ${primaryOrgName}`;
            } else {
              statusText = timestamp ? `Completed on ${timestamp}` : 'Completed';
            }
            statusTextClass = 'text-emerald-700 font-semibold';
          } else if (isCurrent) {
            dotClass = 'bg-[var(--brand)] border-[var(--brand-deep)] text-white ring-4 ring-[var(--brand)]/20 shadow-md animate-pulse';
            titleClass = 'text-[var(--brand-deep)] font-extrabold text-base';
            if (s.key === 'in_progress' && primaryOrgName) {
              statusText = timestamp ? `Accepted & In Progress by ${primaryOrgName} since ${timestamp}` : `Accepted & In Progress by ${primaryOrgName}`;
            } else if (s.key === 'matched' && primaryOrgName) {
              statusText = timestamp ? `Matched with ${primaryOrgName} on ${timestamp}` : `Matched with ${primaryOrgName}`;
            } else {
              statusText = timestamp ? `Active since ${timestamp}` : 'In Progress';
            }
            statusTextClass = 'text-[var(--brand)] font-bold';
          }

          return (
            <div key={s.key} className="flex items-start gap-4 group">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm transition-all ${dotClass}`}>
                  {isDone ? (
                    <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{s.icon}</span>
                  )}
                </div>
                {i < VISUAL_STAGES.length - 1 && (
                  <div className={`w-0.5 min-h-[32px] my-1 transition-all ${i < currentStageIndex ? 'bg-emerald-400' : 'bg-[var(--line)]'}`} />
                )}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className={`text-sm tracking-tight ${titleClass}`}>{s.label}</span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--brand)]/10 text-[var(--brand)]">
                      Current Stage
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--ink-soft)] mt-0.5">{s.description}</p>
                <div className={`text-xs mt-1 ${statusTextClass}`}>{statusText}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matched Organizations Section */}
      {safeMatches.length > 0 && (
        <div className="pt-4 border-t border-[var(--line)]">
          <div className="text-xs font-black uppercase tracking-wider text-[var(--brand-deep)] mb-3 flex items-center gap-1.5">
            <span>🤝</span>
            <span>Matched Organizations (Tri-Party Pipeline)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {safeMatches.map((m) => {
              const org = m.organizations || m.org || {};
              const roleConfig = ROLE_BADGES[m.role] || { label: m.role, style: 'bg-gray-50 text-gray-700' };

              return (
                <div key={m.id || m.org_id} className="p-3.5 rounded-2xl bg-white border border-[var(--line)] shadow-sm space-y-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${roleConfig.style}`}>
                    {roleConfig.label}
                  </span>
                  <div className="font-bold text-sm text-[var(--ink)] leading-snug">
                    {org.name || 'Matched Organization'}
                  </div>
                  <div className="text-[11px] text-[var(--ink-soft)] flex items-center justify-between">
                    <span>Type: <strong className="capitalize">{org.type || m.role}</strong></span>
                    <span>{org.district || ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
