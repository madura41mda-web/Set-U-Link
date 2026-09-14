import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import Toast from '../components/Toast.jsx';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'education', label: 'Education & Schools' },
  { value: 'health', label: 'Healthcare & Medical' },
  { value: 'water', label: 'Clean Water & Sanitation' },
  { value: 'sanitation', label: 'Waste & Hygiene' },
  { value: 'infra', label: 'Infrastructure & Roads' },
  { value: 'agriculture', label: 'Agriculture & Farming' },
  { value: 'livelihood', label: 'Livelihood & Employment' },
];

const DISTRICTS = ['All Districts', 'Ranchi', 'Dhanbad', 'East Singhbhum', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'West Singhbhum'];

export default function IssueFeed() {
  const { user, profile } = useAuth();

  const [issues, setIssues] = useState([]);
  const [userVotes, setUserVotes] = useState({}); // { [issueId]: number }
  const [fetching, setFetching] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [searchTerm, setSearchTerm] = useState('');
  const [submittingVoteId, setSubmittingVoteId] = useState(null);
  const [toast, setToast] = useState(null);

  // Load issues and user's severity votes
  const loadFeedData = useCallback(async () => {
    try {
      setFetching(true);

      // Fetch open issues
      let query = supabase
        .from('issues')
        .select('*, matches(*, organizations(*))')
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      if (selectedDistrict !== 'All Districts') {
        query = query.eq('district', selectedDistrict);
      }

      const { data: issuesData, error: issuesErr } = await query;
      if (issuesErr) throw issuesErr;

      setIssues(issuesData || []);

      // If user is logged in, fetch user's severity votes
      if (user) {
        try {
          const { data: votesData } = await supabase
            .from('severity_votes')
            .select('issue_id, score')
            .eq('voter_id', user.id);

          if (votesData) {
            const voteMap = {};
            votesData.forEach((v) => {
              voteMap[v.issue_id] = v.score;
            });
            setUserVotes(voteMap);
          }
        } catch (vErr) {
          console.warn('Severity votes fetch warning:', vErr);
        }
      }
    } catch (err) {
      console.error('IssueFeed fetch error:', err);
      setToast({ type: 'error', message: 'Failed to load community feed.' });
    } finally {
      setFetching(false);
    }
  }, [user, selectedCategory, selectedDistrict]);

  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  // Handle rating severity on an issue
  const handleVoteSeverity = async (issueId, score) => {
    if (!user) {
      setToast({ type: 'info', message: 'Please log in to cast a severity vote.' });
      return;
    }

    const currentIssue = issues.find((i) => i.id === issueId);
    if (currentIssue?.reporter_id === user.id) {
      setToast({ type: 'warning', message: 'You cannot rate severity on your own reported issue.' });
      return;
    }

    try {
      setSubmittingVoteId(issueId);

      // 1. Upsert into severity_votes table
      const { error: voteErr } = await supabase.from('severity_votes').upsert(
        {
          issue_id: issueId,
          voter_id: user.id,
          score,
        },
        { onConflict: 'issue_id, voter_id' }
      );

      if (voteErr) {
        console.warn('DB vote upsert warning:', voteErr);
      }

      // 2. Fetch all votes for this issue to compute aggregate avg_severity_score
      const { data: allVotes } = await supabase
        .from('severity_votes')
        .select('score')
        .eq('issue_id', issueId);

      let newAvg = score;
      if (allVotes && allVotes.length > 0) {
        const sum = allVotes.reduce((acc, curr) => acc + (curr.score || 0), 0);
        newAvg = parseFloat((sum / allVotes.length).toFixed(1));
      }

      // 3. Update avg_severity_score on issues table
      await supabase
        .from('issues')
        .update({ avg_severity_score: newAvg })
        .eq('id', issueId);

      // Update local state
      setUserVotes((prev) => ({ ...prev, [issueId]: score }));
      setIssues((prev) =>
        prev.map((item) => (item.id === issueId ? { ...item, avg_severity_score: newAvg } : item))
      );

      setToast({ type: 'success', message: `Severity vote (${score}/5) saved! Updated average rating to ${newAvg}/5.` });
    } catch (err) {
      console.error('Severity vote error:', err);
      setToast({ type: 'error', message: 'Failed to record severity vote.' });
    } finally {
      setSubmittingVoteId(null);
    }
  };

  // Filter issues by search term
  const filteredIssues = issues.filter((issue) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      issue.title.toLowerCase().includes(term) ||
      issue.description.toLowerCase().includes(term) ||
      (issue.area && issue.area.toLowerCase().includes(term))
    );
  });

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white/85 nav-blur p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--brand)]/10 text-[var(--brand)] uppercase tracking-wider">
            Public Awareness & Impact
          </span>
          <span className="text-xs text-[var(--ink-soft)] font-medium">Community Civic Feed</span>
        </div>
        <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">Community Issue Feed</h1>
        <p className="text-sm text-[var(--ink-soft)] max-w-2xl">
          Browse civic challenges across Jharkhand. Upvote issues happening in your region and cast severity ratings (1–5 scale) to help prioritize resolution.
        </p>

        {/* Filters */}
        <div className="pt-4 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search issues by title, locality..."
            className="px-4 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[var(--line)] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feed List */}
      {fetching ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-[var(--ink-soft)]">
            <svg className="animate-spin h-6 w-6 text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-semibold text-sm">Loading community feed...</span>
          </div>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="p-12 text-center bg-white/80 nav-blur rounded-3xl border border-[var(--line)] shadow-lg space-y-3">
          <div className="text-3xl">🏜️</div>
          <h3 className="text-lg font-bold text-[var(--ink)]">No issues found</h3>
          <p className="text-xs text-[var(--ink-soft)]">Try broadening your search term or category filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredIssues.map((issue) => {
            const isOwner = user?.id === issue.reporter_id;
            const currentScore = userVotes[issue.id] || 0;
            const avgScore = issue.avg_severity_score ? Number(issue.avg_severity_score).toFixed(1) : '0.0';
            const matchedOrgCount = (issue.matches || []).length;

            return (
              <div
                key={issue.id}
                className="bg-white/90 nav-blur rounded-3xl border border-[var(--line)] shadow-md overflow-hidden p-6 space-y-5 transition-all hover:shadow-xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                        {issue.category}
                      </span>
                      <span className="text-xs font-bold text-[var(--ink-soft)]">📍 {issue.district}</span>
                      {issue.area && (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          🏘️ {issue.area}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {issue.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-[var(--ink)] tracking-tight mt-1">{issue.title}</h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-center">
                      <div className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Avg Severity</div>
                      <div className="text-sm font-black text-amber-950">⭐ {avgScore} / 5</div>
                    </div>
                  </div>
                </div>

                {/* Image if available */}
                {issue.photo_url && (
                  <div className="rounded-2xl overflow-hidden max-h-72 border border-[var(--line)] bg-slate-900">
                    <img src={issue.photo_url} alt={issue.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-[var(--ink)] leading-relaxed bg-[var(--bg)]/50 p-4 rounded-2xl border border-[var(--line)] whitespace-pre-wrap">
                  {issue.description}
                </p>

                {/* Footer Controls: Upvote info & Severity Rating Slider/Stars */}
                <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs text-[var(--ink-soft)] font-medium">
                    <span>👍 <strong className="text-[var(--ink)]">{issue.upvotes || 0}</strong> Upvotes</span>
                    <span>🤝 <strong className="text-[var(--ink)]">{matchedOrgCount}</strong> Matched Orgs</span>
                    <span>📅 {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>

                  {/* Severity Voting Widget */}
                  <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 flex items-center gap-3 w-full sm:w-auto">
                    <div className="text-[11px] font-bold text-purple-950 uppercase tracking-wider shrink-0">
                      Rate Severity:
                    </div>

                    {isOwner ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                        Your Report
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleVoteSeverity(issue.id, star)}
                            disabled={submittingVoteId === issue.id}
                            className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                              currentScore >= star
                                ? 'bg-amber-400 text-amber-950 shadow-sm scale-105'
                                : 'bg-white text-slate-400 hover:bg-amber-100 border border-slate-200'
                            }`}
                            title={`Rate severity ${star} of 5`}
                          >
                            {star}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
