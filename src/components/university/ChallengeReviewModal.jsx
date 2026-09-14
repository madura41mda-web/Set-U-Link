import React, { useState } from 'react';
import { getExplainableMatchScore } from '../../lib/departmentMatcher.js';

export default function ChallengeReviewModal({ match, orgDetails, onClose, onActionSuccess }) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [infoRequestText, setInfoRequestText] = useState('');
  const [showInfoInput, setShowInfoInput] = useState(false);

  if (!match || !match.issues) return null;

  const issue = match.issues;
  const matchDetails = getExplainableMatchScore(issue, orgDetails || match.organizations);

  const reviewStatus = match.review_status || 'pending';

  const handleAccept = async () => {
    try {
      setLoadingAction(true);
      await onActionSuccess(match, 'accept');
      onClose();
    } catch (err) {
      console.error('Accept challenge error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setLoadingAction(true);
      await onActionSuccess(match, 'reject', { reason: rejectReason });
      onClose();
    } catch (err) {
      console.error('Reject challenge error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoRequestText.trim()) return;
    try {
      setLoadingAction(true);
      await onActionSuccess(match, 'request_info', { text: infoRequestText });
      onClose();
    } catch (err) {
      console.error('Request info error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[var(--line)] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                {issue.category}
              </span>
              <span className="text-xs font-bold text-[var(--ink-soft)]">📍 {issue.district}</span>
              {issue.area && (
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  🏘️ {issue.area}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-900 border border-purple-200">
                Review: {reviewStatus.toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
              {issue.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Issue Details & Photo */}
        <div className="space-y-4">
          {issue.photo_url && (
            <div className="rounded-2xl overflow-hidden h-64 border border-[var(--line)] bg-slate-900">
              <img
                src={issue.photo_url}
                alt={issue.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>
          )}

          <p className="text-sm text-[var(--ink)] leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 whitespace-pre-wrap">
            {issue.description}
          </p>

          {/* Community Validation & Severity Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700">Community Upvotes</div>
              <div className="text-base font-black text-purple-950 mt-0.5">👍 {issue.upvotes || 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700">Avg Severity</div>
              <div className="text-base font-black text-amber-950 mt-0.5">⭐ {Number(issue.avg_severity_score || 0).toFixed(1)} / 5</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700">Priority Score</div>
              <div className="text-base font-black text-indigo-950 mt-0.5">🔥 {issue.priority_score || 60} / 100</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-700">Submitter</div>
              <div className="text-base font-black text-slate-900 mt-0.5 capitalize">{issue.submitter_type || 'Citizen'}</div>
            </div>
          </div>
        </div>

        {/* Explainable Match Score Breakdown */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="text-base font-black tracking-tight">Explainable Match Score Breakdown</h3>
            </div>
            <div className="text-2xl font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-800">
              {matchDetails.totalScore} <span className="text-xs text-emerald-300 font-normal">/ 100</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            {matchDetails.explanation}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Category Alignment</div>
              <div className="text-sm font-black text-purple-300">{matchDetails.breakdown.categoryMatch} / 40</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: `${(matchDetails.breakdown.categoryMatch/40)*100}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">R&D Expertise</div>
              <div className="text-sm font-black text-blue-300">{matchDetails.breakdown.expertiseMatch} / 30</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-400 h-full rounded-full" style={{ width: `${(matchDetails.breakdown.expertiseMatch/30)*100}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">District Proximity</div>
              <div className="text-sm font-black text-emerald-300">{matchDetails.breakdown.locationMatch} / 15</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(matchDetails.breakdown.locationMatch/15)*100}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Priority Relevance</div>
              <div className="text-sm font-black text-amber-300">{matchDetails.breakdown.priorityRelevance} / 15</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(matchDetails.breakdown.priorityRelevance/15)*100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Rule-Based Department & Skills Suggestions */}
        <div className="bg-purple-50/70 p-5 rounded-3xl border border-purple-100 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
            <span>🔬</span> Suggested Academic Departments & Project Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {matchDetails.suggestedDepartments.map((dept, i) => (
              <span key={i} className="px-3 py-1 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs">
                {dept}
              </span>
            ))}
          </div>
          <div className="pt-2 border-t border-purple-200/60 flex items-center gap-2 flex-wrap text-xs text-purple-900">
            <span className="font-bold">Recommended Student Skills:</span>
            {matchDetails.recommendedSkills.map((skill, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-purple-200 font-semibold text-[11px]">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Interactive Action Workflows */}
        <div className="pt-4 border-t border-[var(--line)] space-y-4">
          {showRejectInput ? (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-3">
              <label className="block text-xs font-bold text-red-950">
                Specify Reason for Rejecting Challenge:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Out of current R&D scope, lack of specialized lab equipment..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-red-300 bg-white text-slate-900 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loadingAction || !rejectReason.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          ) : showInfoInput ? (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3">
              <label className="block text-xs font-bold text-blue-950">
                Submit Inquiry / Request Information:
              </label>
              <textarea
                value={infoRequestText}
                onChange={(e) => setInfoRequestText(e.target.value)}
                placeholder="e.g. Requesting water sample chemical composition data or site access permission..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-blue-300 bg-white text-slate-900 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowInfoInput(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestInfo}
                  disabled={loadingAction || !infoRequestText.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  Submit Inquiry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-[var(--ink-soft)] font-medium">
                University Review Decision for <strong className="text-[var(--ink)]">{orgDetails?.name || 'Your University'}</strong>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer flex-1 sm:flex-none"
                >
                  ❌ Reject Challenge
                </button>
                <button
                  onClick={() => setShowInfoInput(true)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer flex-1 sm:flex-none"
                >
                  💬 Request Info
                </button>
                <button
                  onClick={handleAccept}
                  disabled={loadingAction}
                  className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-md transition-all cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                >
                  <span>✅</span>
                  <span>{loadingAction ? 'Processing...' : 'Accept Challenge'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
