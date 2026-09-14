import React, { useState } from 'react';
import { getExplainableMatchScore, getDepartmentSuggestions } from '../../lib/departmentMatcher.js';
import FacultyMentorSelector from './FacultyMentorSelector.jsx';
import { supabase } from '../../lib/supabaseClient.js';

const STAGE_LABELS = {
  reported: 'Reported',
  validated: 'Validated',
  matched: 'Matched',
  sanctioned: 'Sanctioned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export default function UniversityChallengeSections({
  match,
  issue,
  orgDetails,
  reviewStatus,
  formedTeam,
  comments = [],
  user,
  onReviewAction,
  onUpdateStatus,
  outcomeType,
  onOutcomeTypeChange,
  onOpenTeamModal,
  onMentorAssigned,
  onAddComment,
  updatingIssueId
}) {
  const matchScore = getExplainableMatchScore(issue, orgDetails || match?.organizations);
  const deptSuggestions = getDepartmentSuggestions(issue?.category);

  // Inline forms state
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingMentor, setEditingMentor] = useState(false);

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    await onReviewAction(match, 'reject', { reason: rejectReason });
    setRejecting(false);
    setRejectReason('');
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    if (!infoText.trim()) return;
    await onReviewAction(match, 'request_info', { text: infoText });
    setRequestingInfo(false);
    setInfoText('');
  };

  const handlePostCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await onAddComment(issue.id, commentText);
      setCommentText('');
    } finally {
      setPostingComment(false);
    }
  };

  // Sort comments chronologically
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <div className="space-y-6 pt-4 border-t border-[var(--line)]">
      
      {/* 1. Explainable Match Score Card */}
      <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h4 className="text-xs font-black uppercase text-purple-950 tracking-wider">
              Explainable AI Match Breakdown
            </h4>
          </div>
          <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs shadow-xs">
            Overall Match: {matchScore.totalScore} / 100
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Category Match</div>
            <div className="font-black text-purple-900 text-sm">
              {matchScore.breakdown.categoryMatch} <span className="text-[10px] font-normal text-slate-400">/ 40</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full"
                style={{ width: `${((matchScore.breakdown.categoryMatch || 0) / 40) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Expertise Match</div>
            <div className="font-black text-purple-900 text-sm">
              {matchScore.breakdown.expertiseMatch} <span className="text-[10px] font-normal text-slate-400">/ 30</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full"
                style={{ width: `${((matchScore.breakdown.expertiseMatch || 0) / 30) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Location Match</div>
            <div className="font-black text-purple-900 text-sm">
              {matchScore.breakdown.locationMatch} <span className="text-[10px] font-normal text-slate-400">/ 15</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${((matchScore.breakdown.locationMatch || 0) / 15) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Priority Match</div>
            <div className="font-black text-purple-900 text-sm">
              {matchScore.breakdown.priorityRelevance} <span className="text-[10px] font-normal text-slate-400">/ 15</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${((matchScore.breakdown.priorityRelevance || 0) / 15) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-purple-900/80 font-medium">
          💡 <strong>Matching Reason:</strong> Matched based on category domain ({issue.category}), geographic district ({issue.district}), and active R&D capabilities.
        </p>
      </div>

      {/* 2. Suggested Departments Card */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏛️</span>
          <h4 className="text-xs font-black uppercase text-[var(--ink)] tracking-wider">
            Suggested Academic Departments & Expertise Requirements
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-bold text-purple-900 uppercase">Primary Lead Departments</div>
            <div className="flex flex-wrap gap-1.5">
              {deptSuggestions.primaryDepartments.map((dept, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
                  {dept}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-bold text-blue-900 uppercase">Interdisciplinary Collaborators</div>
            <div className="flex flex-wrap gap-1.5">
              {deptSuggestions.secondaryDepartments.map((dept, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                  {dept}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="font-bold text-slate-700">Required Skill Keywords:</span>
          {(deptSuggestions.recommendedSkills || deptSuggestions.skills || []).map((skill, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-semibold">
              #{skill}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Stage Action Controls (Lifecycle Advancement) */}
      <div className="bg-white p-5 rounded-2xl border border-[var(--line)] space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <h4 className="text-xs font-black uppercase text-[var(--ink)] tracking-wider flex items-center gap-2">
              <span>⚡</span> Stage Action Controls
            </h4>
            <p className="text-[11px] text-[var(--ink-soft)] font-medium">
              Current Stage: <strong className="text-purple-950 uppercase">{STAGE_LABELS[issue.status] || issue.status}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(issue.status === 'reported' || issue.status === 'validated') && (
              <button
                onClick={() => onUpdateStatus(issue, 'matched')}
                disabled={updatingIssueId === issue.id}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 border border-purple-700 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🤝</span> Mark as Matched
              </button>
            )}

            {issue.status === 'matched' && (
              <button
                onClick={() => onUpdateStatus(issue, 'sanctioned')}
                disabled={updatingIssueId === issue.id}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🏛️</span> Mark as Sanctioned
              </button>
            )}

            {issue.status === 'sanctioned' && (
              <button
                onClick={() => onUpdateStatus(issue, 'in_progress')}
                disabled={updatingIssueId === issue.id}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-cyan-600 hover:bg-cyan-700 border border-cyan-700 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🚧</span> Start In Progress / Field Testing
              </button>
            )}

            {issue.status === 'in_progress' && (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={outcomeType || 'deployed_solution'}
                  onChange={(e) => onOutcomeTypeChange && onOutcomeTypeChange(issue.id, e.target.value)}
                  className="text-xs font-semibold p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
                >
                  <option value="deployed_solution">Deployed Solution</option>
                  <option value="research_output">Research Output</option>
                  <option value="pilot_test">Pilot Test</option>
                  <option value="policy_change">Policy Change</option>
                </select>
                <button
                  onClick={() => onUpdateStatus(issue, 'resolved')}
                  disabled={updatingIssueId === issue.id}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>✅</span> Mark as Resolved
                </button>
              </div>
            )}

            {issue.status === 'resolved' && (
              <span className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                <span>🎉</span> Solution Deployed & Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Review Actions Section */}
      <div className="bg-white p-5 rounded-2xl border border-[var(--line)] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div>
            <h4 className="text-xs font-black uppercase text-[var(--ink)] tracking-wider flex items-center gap-2">
              <span>📋</span> University Challenge Review & Workflow Status
            </h4>
            <p className="text-[11px] text-[var(--ink-soft)] font-medium">
              Current Status: <strong className="text-purple-900 uppercase">{reviewStatus}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onReviewAction(match, 'accept')}
              disabled={reviewStatus === 'accepted'}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                reviewStatus === 'accepted'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 opacity-80'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700'
              }`}
            >
              {reviewStatus === 'accepted' ? '✓ Challenge Accepted' : '✓ Accept Challenge'}
            </button>

            <button
              onClick={() => {
                setRejecting(!rejecting);
                setRequestingInfo(false);
              }}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
            >
              ✕ Reject Challenge
            </button>

            <button
              onClick={() => {
                setRequestingInfo(!requestingInfo);
                setRejecting(false);
              }}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
            >
              💬 Request More Info
            </button>
          </div>
        </div>

        {/* Inline Reject Form */}
        {rejecting && (
          <form onSubmit={handleRejectSubmit} className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3">
            <div className="text-xs font-bold text-red-900">Specify Reason for Declining Challenge:</div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Outside academic R&D domain or lack of testing equipment in current session..."
              className="w-full text-xs p-3 rounded-xl border border-red-300 bg-white text-slate-900 focus:outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 border border-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        )}

        {/* Inline Request Info Form */}
        {requestingInfo && (
          <form onSubmit={handleInfoSubmit} className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="text-xs font-bold text-blue-900">Request Information / Inquiry Details:</div>
            <textarea
              value={infoText}
              onChange={(e) => setInfoText(e.target.value)}
              placeholder="e.g. Please clarify exact GPS coordinates or water sample collection site..."
              className="w-full text-xs p-3 rounded-xl border border-blue-300 bg-white text-slate-900 focus:outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestingInfo(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!infoText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 disabled:opacity-50"
              >
                Post Inquiry
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Multidisciplinary Team Formation Section */}
      <div className="bg-white p-5 rounded-2xl border border-[var(--line)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h4 className="text-xs font-black uppercase text-[var(--ink)] tracking-wider flex items-center gap-2">
              <span>👥</span> Multidisciplinary Student R&D Team
            </h4>
            <p className="text-[11px] text-[var(--ink-soft)] font-medium">
              {formedTeam ? `Active Team: ${formedTeam.team_name}` : 'No student team assigned yet'}
            </p>
          </div>

          <button
            onClick={() => onOpenTeamModal(issue)}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-purple-600 text-white hover:bg-purple-700 border border-purple-700 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>{formedTeam ? '✏️' : '➕'}</span>
            {formedTeam ? 'Edit Team Roster' : 'Form Multidisciplinary Team'}
          </button>
        </div>

        {formedTeam ? (
          <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-purple-950">{formedTeam.team_name}</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 font-bold text-[10px]">
                {formedTeam.student_members?.length || 0} Student Members
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(formedTeam.departments || []).map((d, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-white text-purple-900 font-bold text-[10px] border border-purple-200">
                  🏛️ {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-purple-200/60">
              {(formedTeam.student_members || []).map((m, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-purple-100 space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>🎓 {m.student_name}</span>
                    <span className="text-[10px] text-purple-700 font-mono">{m.roll_number}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-purple-900">{m.role}</div>
                  <div className="text-[10px] text-slate-500">{m.department}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1">
            <div className="text-xs font-bold text-slate-600">Assign students across departments</div>
            <div className="text-[11px] text-slate-500">Create project teams combining Civil, CS/IoT, Environmental, and Mechanical engineering.</div>
          </div>
        )}
      </div>

      {/* 5. Faculty Mentor Assignment Section */}
      <div className="bg-white p-5 rounded-2xl border border-[var(--line)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h4 className="text-xs font-black uppercase text-[var(--ink)] tracking-wider flex items-center gap-2">
              <span>👨‍🏫</span> Assigned Faculty Mentor
            </h4>
            <p className="text-[11px] text-[var(--ink-soft)] font-medium">
              {formedTeam?.faculty_mentor ? formedTeam.faculty_mentor.name : 'Select lead faculty for academic oversight'}
            </p>
          </div>

          <button
            onClick={() => setEditingMentor(!editingMentor)}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
          >
            {editingMentor ? 'Close Selector' : 'Change Mentor'}
          </button>
        </div>

        {editingMentor ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <FacultyMentorSelector
              orgId={orgDetails?.id}
              selectedMentorId={formedTeam?.faculty_mentor?.id}
              onSelectMentor={(mentor) => {
                onMentorAssigned(issue.id, mentor);
                setEditingMentor(false);
              }}
            />
          </div>
        ) : formedTeam?.faculty_mentor ? (
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-black text-sm text-purple-950 flex items-center gap-1.5">
                  <span>👨‍🏫</span> {formedTeam.faculty_mentor.name}
                </div>
                <div className="text-xs font-bold text-purple-900">{formedTeam.faculty_mentor.title}</div>
                <div className="text-[11px] font-medium text-slate-600">{formedTeam.faculty_mentor.department}</div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white font-bold text-[10px]">
                Assigned Mentor
              </span>
            </div>

            <div className="flex flex-wrap gap-1 pt-1 border-t border-purple-200/60">
              {(formedTeam.faculty_mentor.expertise || []).map((exp, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-white text-purple-900 text-[10px] font-bold border border-purple-200">
                  {exp}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>No mentor explicitly selected yet. Click "Change Mentor" to select from faculty roster.</span>
            <button
              onClick={() => setEditingMentor(true)}
              className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-xs"
            >
              Select Mentor
            </button>
          </div>
        )}
      </div>

      {/* 6. Fix & Redesign: Official Activity & Updates Feed */}
      <div className="bg-white p-5 rounded-2xl border border-[var(--line)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h4 className="text-xs font-black uppercase text-[var(--ink)] tracking-wider flex items-center gap-2">
            <span>📢</span> Official Activity & Updates Feed
          </h4>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[11px] border border-purple-200">
            {sortedComments.length} {sortedComments.length === 1 ? 'Update' : 'Updates'}
          </span>
        </div>

        {/* Activity Feed List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {sortedComments.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-600">No updates or inquiries posted yet</div>
              <div className="text-[11px] text-slate-500">Post an official update below to log project milestones or ask the citizen/govt for details.</div>
            </div>
          ) : (
            sortedComments.map((c) => {
              const isOrg = c.is_org_update || (c.body && c.body.startsWith('[Org Update'));
              const isInfoReq = c.body && c.body.startsWith('[University Inquiry');
              const authorName = c.profiles?.full_name || 'Organization Representative';
              const roleTag = isOrg ? 'University / Org' : c.profiles?.role || 'Citizen';
              const dateStr = new Date(c.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              });

              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border space-y-1.5 transition-all ${
                    isInfoReq
                      ? 'bg-blue-50/60 border-blue-200'
                      : isOrg
                      ? 'bg-purple-50/60 border-purple-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-slate-900 flex items-center gap-1">
                        {isInfoReq ? '💬' : isOrg ? '🏛️' : '👤'} {authorName}
                      </span>
                      <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold uppercase ${
                        isInfoReq ? 'bg-blue-200 text-blue-900' : isOrg ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {roleTag}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{dateStr}</span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-5">
                    {c.body}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handlePostCommentSubmit} className="pt-2 border-t border-[var(--line)] flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Post official university update / inquiry for citizen or govt..."
            className="flex-1 text-xs p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={postingComment || updatingIssueId === issue.id || !commentText.trim()}
            className="px-5 py-3 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 border border-purple-700 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {postingComment ? 'Posting...' : 'Post Update'}
          </button>
        </form>
      </div>

    </div>
  );
}
