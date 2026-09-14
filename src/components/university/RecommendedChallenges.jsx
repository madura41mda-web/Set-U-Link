import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { getExplainableMatchScore } from '../../lib/departmentMatcher.js';

export default function RecommendedChallenges({ orgDetails, onAdoptChallenge }) {
  const [recommendedIssues, setRecommendedIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adoptingId, setAdoptingId] = useState(null);

  useEffect(() => {
    async function fetchRecommended() {
      if (!orgDetails) return;
      try {
        setLoading(true);

        // Fetch reported / validated issues in org's district
        let { data: issuesData, error } = await supabase
          .from('issues')
          .select('*, matches(*)')
          .in('status', ['reported', 'validated'])
          .order('priority_score', { ascending: false })
          .limit(6);

        if (!error && issuesData) {
          // Filter issues not already matched to this organization
          const unassigned = issuesData.filter((issue) => {
            const orgMatches = issue.matches || [];
            return !orgMatches.some((m) => m.org_id === orgDetails.id);
          });
          setRecommendedIssues(unassigned.slice(0, 3));
        }
      } catch (err) {
        console.warn('Fetch recommended challenges warning:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecommended();
  }, [orgDetails]);

  const handleClaim = async (issue) => {
    try {
      setAdoptingId(issue.id);
      await onAdoptChallenge(issue);
      setRecommendedIssues((prev) => prev.filter((i) => i.id !== issue.id));
    } catch (err) {
      console.error('Error claiming challenge:', err);
    } finally {
      setAdoptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/90 nav-blur rounded-3xl border border-[var(--line)] p-6 shadow-sm space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (recommendedIssues.length === 0) return null;

  return (
    <div className="bg-white/90 nav-blur rounded-3xl border border-[var(--line)] p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h3 className="text-lg font-black text-[var(--ink)] tracking-tight">
              Recommended for {orgDetails?.name || 'Your University'}
            </h3>
          </div>
          <p className="text-xs text-[var(--ink-soft)] font-medium mt-0.5">
            Open civic challenges in <strong className="text-[var(--ink)]">{orgDetails?.district || 'your region'}</strong> matching your R&D departments
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
          Smart Match Suggestions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendedIssues.map((issue) => {
          const matchScore = getExplainableMatchScore(issue, orgDetails);
          const isClaiming = adoptingId === issue.id;

          return (
            <div
              key={issue.id}
              className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100 space-y-3 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                    {issue.category}
                  </span>
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    🎯 Match Score: {matchScore.totalScore}/100
                  </span>
                </div>

                <h4 className="text-sm font-black text-[var(--ink)] leading-snug line-clamp-2">
                  {issue.title}
                </h4>

                <p className="text-xs text-[var(--ink-soft)] line-clamp-2 leading-relaxed">
                  {issue.description}
                </p>

                <div className="text-[11px] font-semibold text-purple-900 flex items-center gap-2 pt-1">
                  <span>📍 {issue.district}</span>
                  <span>•</span>
                  <span>🔥 Priority: {issue.priority_score || 60}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-purple-100/80">
                <button
                  onClick={() => handleClaim(issue)}
                  disabled={isClaiming}
                  className="w-full py-2 rounded-xl font-black text-xs text-white bg-purple-600 hover:bg-purple-700 border border-purple-700 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>🤝</span>
                  <span>{isClaiming ? 'Adopting Challenge...' : 'Adopt & Form Team'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
