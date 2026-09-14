import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import Toast from '../components/Toast.jsx';
import LocationPickerMap from '../components/LocationPickerMap.jsx';
import { parseCoords, calculateDistanceMeters } from '../lib/geoUtils.js';
import { classifyIssueCategory } from '../lib/aiClassifier.js';
import { calculatePriorityScore } from '../lib/priorityScorer.js';
import { matchIssue } from '../lib/matchingEngine.js';

const CATEGORIES = [
  { value: 'health', label: 'Doctor & Healthcare', icon: '🩺', desc: 'Clinics, doctors, medicines, public health' },
  { value: 'water', label: 'Clean Water & Supply', icon: '💧', desc: 'Pipes, borewells, drinking water, contamination' },
  { value: 'agriculture', label: 'Food & Agriculture', icon: '🌾', desc: 'Farming, irrigation, cold storage, MSP, seeds' },
  { value: 'sanitation', label: 'Waste & Sanitation', icon: '🗑️', desc: 'Garbage disposal, sewage, drainage, hygiene' },
  { value: 'infra', label: 'Roads & Infrastructure', icon: '🛣️', desc: 'Potholes, bridges, streetlights, public buildings' },
  { value: 'electricity', label: 'Electricity & Power', icon: '⚡', desc: 'Outages, transformers, wires, solar energy' },
  { value: 'education', label: 'Education & Schools', icon: '📚', desc: 'Classrooms, teachers, mid-day meals, libraries' },
  { value: 'livelihood', label: 'Livelihood & Jobs', icon: '💼', desc: 'SHGs, skill training, rural enterprise, jobs' },
  { value: 'safety', label: 'Public Safety & Law', icon: '🚨', desc: 'Street safety, emergency response, civil issues' },
];

const DISTRICT_CENTERS = {
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Dhanbad: { lat: 23.7957, lng: 86.4304 },
  'East Singhbhum': { lat: 22.8046, lng: 86.2029 },
  Bokaro: { lat: 23.6693, lng: 85.9812 },
  Hazaribagh: { lat: 23.9981, lng: 85.3647 },
  Deoghar: { lat: 24.4826, lng: 86.6994 },
  Giridih: { lat: 24.1843, lng: 86.3039 },
  Ramgarh: { lat: 23.6288, lng: 85.5152 },
  'West Singhbhum': { lat: 22.5539, lng: 85.8081 },
};

const JHARKHAND_BOUNDS = {
  minLat: 21.9,
  maxLat: 25.3,
  minLng: 83.3,
  maxLng: 87.9,
};

const isWithinJharkhand = (lat, lng) => {
  return (
    lat >= JHARKHAND_BOUNDS.minLat &&
    lat <= JHARKHAND_BOUNDS.maxLat &&
    lng >= JHARKHAND_BOUNDS.minLng &&
    lng <= JHARKHAND_BOUNDS.maxLng
  );
};

export default function ReportIssue() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetEntity, setTargetEntity] = useState('govt'); // 'govt' | 'university' | 'industry'
  const [category, setCategory] = useState('water');
  const [district, setDistrict] = useState('Ranchi');
  const [area, setArea] = useState('Doranda');
  const [submitterType, setSubmitterType] = useState('citizen');
  const [latitude, setLatitude] = useState(DISTRICT_CENTERS.Ranchi.lat);
  const [longitude, setLongitude] = useState(DISTRICT_CENTERS.Ranchi.lng);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [validGpsDetected, setValidGpsDetected] = useState(false);
  const [gpsWarning, setGpsWarning] = useState(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestedCat, setAiSuggestedCat] = useState(null);

  // Locality Chips & Reverse Geocoding State
  const [localityChips, setLocalityChips] = useState([]);
  const [localityLoading, setLocalityLoading] = useState(false);
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);
  const geocodeCacheRef = useRef({});

  // Debounced reverse-geocoding of pin lat/lng using OpenStreetMap Nominatim API
  useEffect(() => {
    if (!latitude || !longitude) return;

    const cacheKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

    if (geocodeCacheRef.current[cacheKey]) {
      const cachedChips = geocodeCacheRef.current[cacheKey];
      setLocalityChips(cachedChips);
      if (cachedChips.length > 0 && (!area || !cachedChips.includes(area))) {
        setArea(cachedChips[0]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLocalityLoading(true);
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en&email=setulink@jharkhand.gov.in`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'SetuLink-CivicApp/1.0 (setulink@jharkhand.gov.in)',
          },
        });
        const data = await res.json();
        const addr = data?.address || {};

        const candidates = [];
        const keys = ['suburb', 'neighbourhood', 'village', 'hamlet', 'town', 'quarter', 'residential', 'city_district', 'road'];

        for (const k of keys) {
          if (addr[k] && typeof addr[k] === 'string' && addr[k].trim()) {
            const val = addr[k].trim();
            if (
              !candidates.includes(val) &&
              val.toLowerCase() !== district.toLowerCase() &&
              val.toLowerCase() !== 'india' &&
              val.toLowerCase() !== 'jharkhand'
            ) {
              candidates.push(val);
            }
          }
        }

        const topChips = candidates.slice(0, 3);
        geocodeCacheRef.current[cacheKey] = topChips;
        setLocalityChips(topChips);

        if (topChips.length > 0) {
          setArea(topChips[0]);
        } else {
          setShowCustomAreaInput(true);
        }
      } catch (err) {
        console.warn('Reverse geocode error:', err);
        setLocalityChips([]);
        setShowCustomAreaInput(true);
      } finally {
        setLocalityLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [latitude, longitude, district]);

  const handleAiCategorize = async () => {
    if (!description.trim() && !title.trim()) {
      setToast({ type: 'info', message: 'Please enter a title or description first for AI categorization.' });
      return;
    }
    setAiSuggesting(true);
    try {
      const suggested = await classifyIssueCategory(title, description);
      setCategory(suggested);
      setAiSuggestedCat(suggested);
      const catLabel = CATEGORIES.find((c) => c.value === suggested)?.label || suggested;
      setToast({ type: 'success', message: `🤖 AI Categorized issue as: ${catLabel}` });
    } catch (err) {
      console.warn('AI categorization error:', err);
    } finally {
      setAiSuggesting(false);
    }
  };

  // Require auth - redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { message: 'Please log in to report a civic issue.' } });
    }
  }, [user, loading, navigate]);

  // Validation function
  const validateForm = (
    currentTitle = title,
    currentDesc = description,
    currentCat = category,
    currentDist = district,
    currentArea = area
  ) => {
    const errors = {};

    if (!currentTitle.trim()) {
      errors.title = 'Issue title is required.';
    } else if (currentTitle.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters long.';
    }

    if (!currentDesc.trim()) {
      errors.description = 'Detailed description is required.';
    } else if (currentDesc.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long to provide clear context.';
    }

    if (!currentCat) {
      errors.category = 'Please select a valid issue category.';
    }

    if (!currentDist) {
      errors.district = 'Please select a valid district.';
    }

    if (!currentArea.trim()) {
      errors.area = 'Area / Locality is required (e.g. Doranda, Jaynagar).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Live input change handlers with clear error on fix
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (submitAttempted) validateForm(val, description, category, district, area);
  };

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setDescription(val);
    if (submitAttempted) validateForm(title, val, category, district, area);
  };

  const handleAreaChange = (e) => {
    const val = e.target.value;
    setArea(val);
    if (submitAttempted) validateForm(title, description, category, district, val);
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    if (submitAttempted) validateForm(title, description, val, district);
  };

  const handleDistrictChange = (e) => {
    const selectedDistrict = e.target.value;
    setDistrict(selectedDistrict);
    if (DISTRICT_CENTERS[selectedDistrict]) {
      if (!validGpsDetected) {
        setLatitude(DISTRICT_CENTERS[selectedDistrict].lat);
        setLongitude(DISTRICT_CENTERS[selectedDistrict].lng);
        setGpsWarning(null);
      }
    }
    if (submitAttempted) validateForm(title, description, category, selectedDistrict);
  };

  // Detect browser geolocation
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setToast({ type: 'warning', message: 'Geolocation is not supported by your browser.' });
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = parseFloat(pos.coords.latitude.toFixed(6));
        const detectedLng = parseFloat(pos.coords.longitude.toFixed(6));

        if (!isWithinJharkhand(detectedLat, detectedLng)) {
          setValidGpsDetected(false);
          const warnText =
            'This location appears to be outside Jharkhand — please select your district manually and adjust the pin if needed';
          setGpsWarning(warnText);
          if (DISTRICT_CENTERS[district]) {
            setLatitude(DISTRICT_CENTERS[district].lat);
            setLongitude(DISTRICT_CENTERS[district].lng);
          }
          setToast({
            type: 'warning',
            message: warnText,
          });
        } else {
          setLatitude(detectedLat);
          setLongitude(detectedLng);
          setValidGpsDetected(true);
          setGpsWarning(null);
          setToast({ type: 'success', message: 'Current location coordinates detected successfully!' });
        }
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoLoading(false);
        setValidGpsDetected(false);
        setToast({ type: 'warning', message: 'Could not fetch location. Using default district coordinates.' });
      },
      { timeout: 8000 }
    );
  };

  // Handle photo file select
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setToast({ type: 'error', message: 'Photo size must be less than 10MB.' });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!user) {
      setToast({ type: 'error', message: 'You must be logged in to submit an issue.' });
      return;
    }

    // Run client-side validation
    const isValid = validateForm();
    if (!isValid) {
      // Scroll to top of form to display summary error banner
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);
      let photoUrl = null;

      // 1. Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('issue-photos')
            .upload(fileName, photoFile, { cacheControl: '3600', upsert: true });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('issue-photos')
              .getPublicUrl(fileName);
            photoUrl = publicUrlData?.publicUrl || null;
          } else {
            console.warn('Supabase storage upload error, using Data URL fallback:', uploadError);
            photoUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(photoFile);
            });
          }
        } catch (stErr) {
          console.warn('Storage exception, using Data URL fallback:', stErr);
          photoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(photoFile);
          });
        }
      }

      // 2. Spatial & District+Area Duplicate Check:
      // Check for existing OPEN issues with:
      // a) spatial proximity within ~500 meters, OR
      // b) same district + same category + same area/locality
      let matchedOpenIssue = null;

      try {
        const { data: openIssues } = await supabase
          .from('issues')
          .select('id, title, category, district, area, description, location, upvotes, status')
          .neq('status', 'resolved')
          .eq('category', category);

        if (openIssues && openIssues.length > 0) {
          const currentDistrictNorm = district.trim().toLowerCase();
          const currentAreaNorm = area.trim().toLowerCase();

          for (const openIssue of openIssues) {
            // Check 1: 500m Spatial match
            let isSpatialMatch = false;
            const coords = parseCoords(openIssue.location);
            if (coords.lat !== 'N/A' && coords.lng !== 'N/A') {
              const distMeters = calculateDistanceMeters(latitude, longitude, coords.lat, coords.lng);
              if (distMeters <= 500) {
                isSpatialMatch = true;
              }
            }

            // Check 2: Same District + Same Area + Same Category match
            let isAreaMatch = false;
            const openDistrictNorm = (openIssue.district || '').trim().toLowerCase();
            const openAreaNorm = (openIssue.area || '').trim().toLowerCase();
            const openDescNorm = (openIssue.description || '').toLowerCase();

            if (openDistrictNorm === currentDistrictNorm && currentAreaNorm.length > 0) {
              if (openAreaNorm === currentAreaNorm) {
                isAreaMatch = true;
              } else if (openDescNorm.includes(`[locality: ${currentAreaNorm}]`) || openDescNorm.includes(currentAreaNorm)) {
                isAreaMatch = true;
              }
            }

            // OR Condition: Either 500m spatial match OR district+area+category match triggers duplicate
            if (isSpatialMatch || isAreaMatch) {
              matchedOpenIssue = openIssue;
              break;
            }
          }
        }
      } catch (dupErr) {
        console.warn('Duplicate check warning:', dupErr);
      }

      // If an existing open issue matches (via 500m OR district+area+category), DO NOT INSERT A NEW ROW INTO ISSUES!
      if (matchedOpenIssue) {
        // A. Increment upvotes on existing issue by 1
        const newUpvotes = (matchedOpenIssue.upvotes || 0) + 1;
        await supabase
          .from('issues')
          .update({ upvotes: newUpvotes })
          .eq('id', matchedOpenIssue.id);

        // B. Insert lightweight confirmation comment in comments table
        try {
          await supabase.from('comments').insert([
            {
              issue_id: matchedOpenIssue.id,
              author_id: profile?.id || user.id,
              body: `Confirmed & upvoted issue via submission: "${title.trim()}"`,
            },
          ]);
        } catch (commentErr) {
          console.warn('Could not insert confirmation comment:', commentErr);
        }

        // C. Notify citizen clearly without creating a new report row
        setToast({
          type: 'info',
          message: `This looks like an existing report in your area ("${matchedOpenIssue.title}") — we've added your confirmation and upvoted it!`,
        });

        setTimeout(() => {
          navigate('/my-reports');
        }, 2000);

        return; // STOP execution here - no new row inserted into issues or status_history!
      }

      // 3. Determine initial status and priority score for NEW non-duplicate reports
      const isOfficial = submitterType === 'panchayat' || submitterType === 'ulb';
      const initialStatus = isOfficial ? 'validated' : 'reported';

      const computedPriorityScore = calculatePriorityScore({
        upvotes: 0,
        created_at: new Date(),
        title: title.trim(),
        description: description.trim(),
        submitter_type: submitterType,
      });

      const targetLabel = targetEntity === 'university' ? 'University' : targetEntity === 'industry' ? 'Industry' : 'Government';
      const formattedDescription = `[Target: ${targetLabel}]\n[Locality: ${area.trim() || district}]\n\n${description.trim()}`;

      const issuePayload = {
        title: title.trim(),
        description: formattedDescription,
        category,
        district,
        area: area.trim(),
        location: `POINT(${longitude} ${latitude})`,
        photo_url: photoUrl,
        status: initialStatus,
        upvotes: 0,
        reporter_id: profile?.id || user.id,
        submitter_type: submitterType,
        priority_score: computedPriorityScore,
        duplicate_of: null,
      };

      const { data: newIssue, error: issueError } = await supabase
        .from('issues')
        .insert([issuePayload])
        .select()
        .single();

      if (issueError) throw issueError;

      // 4. Insert into status_history table (always insert 'reported', and also 'validated' if official)
      const historyRows = [
        {
          issue_id: newIssue.id,
          stage: 'reported',
          outcome_type: null,
          changed_by: user.id,
        },
      ];

      if (initialStatus === 'validated') {
        historyRows.push({
          issue_id: newIssue.id,
          stage: 'validated',
          outcome_type: null,
          changed_by: user.id,
        });
      }

      const { error: historyError } = await supabase
        .from('status_history')
        .insert(historyRows);

      if (historyError) {
        console.error('Status history insert error details:', historyError);
        throw new Error(`Issue created, but failed to log status history: ${historyError.message || historyError.details || 'RLS or schema error'}`);
      }

      // 5. Run Edge Matching Engine for newly reported issues so they immediately route to University & Industry partners
      let matchResult = null;
      try {
        matchResult = await matchIssue(newIssue.id, profile?.id || user.id);
      } catch (matchErr) {
        console.warn('Auto match warning:', matchErr);
      }

      if (matchResult && matchResult.matched) {
        setToast({
          type: 'success',
          message: `🎉 Issue submitted & auto-matched with ${matchResult.matches?.length || 1} partner organizations! Routed to University & Industry dashboards.`,
        });
      } else if (isOfficial) {
        setToast({
          type: 'success',
          message: `Official ${submitterType.toUpperCase()} report submitted! Awaiting university mentor assignment.`,
        });
      } else {
        setToast({ type: 'success', message: 'Issue submitted successfully!' });
      }

      setTimeout(() => {
        navigate('/my-reports');
      }, 1800);
    } catch (err) {
      console.error('Submission error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to submit issue. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--ink-soft)]">
          <svg className="animate-spin h-6 w-6 text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-sm">Loading auth session...</span>
        </div>
      </div>
    );
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="pt-24 pb-16 min-h-[90vh] px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="bg-white/85 nav-blur p-6 sm:p-10 rounded-3xl border border-[var(--line)] shadow-2xl space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--brand)]/10 text-[var(--brand)] uppercase tracking-wider mb-2">
            Civic Issue Reporting
          </span>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">Report a Civic Issue</h1>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            Submit a real problem in your community to be matched with universities, CSR funds, and government agencies.
          </p>
        </div>

        {/* Global Error Summary Banner */}
        {submitAttempted && hasErrors && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-sm animate-shake">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-extrabold text-red-900">Some fields need your attention</h4>
              <p className="text-xs text-red-700 mt-0.5">
                Please review and fix the highlighted errors below before submitting your report.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Target Entity Selector (Route To) */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯 Route Problem To</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                Direct CMS Routing
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetEntity('govt')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  targetEntity === 'govt'
                    ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                    : 'bg-white text-[var(--ink)] border-[var(--line)] hover:border-purple-300 hover:bg-purple-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🏛️</span>
                  {targetEntity === 'govt' && <span className="text-xs font-bold">✓ Selected</span>}
                </div>
                <div className="font-extrabold text-xs">Government Dept</div>
                <div className={`text-[10px] line-clamp-2 leading-tight ${targetEntity === 'govt' ? 'text-purple-100' : 'text-[var(--ink-soft)]'}`}>
                  Municipal, Roads, Water, Electricity, Sanitation
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetEntity('university')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  targetEntity === 'university'
                    ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                    : 'bg-white text-[var(--ink)] border-[var(--line)] hover:border-purple-300 hover:bg-purple-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🎓</span>
                  {targetEntity === 'university' && <span className="text-xs font-bold">✓ Selected</span>}
                </div>
                <div className="font-extrabold text-xs">University / HEI</div>
                <div className={`text-[10px] line-clamp-2 leading-tight ${targetEntity === 'university' ? 'text-purple-100' : 'text-[var(--ink-soft)]'}`}>
                  R&D, Technical Innovation, Faculty Mentors & Student Teams
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetEntity('industry')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  targetEntity === 'industry'
                    ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                    : 'bg-white text-[var(--ink)] border-[var(--line)] hover:border-purple-300 hover:bg-purple-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🏢</span>
                  {targetEntity === 'industry' && <span className="text-xs font-bold">✓ Selected</span>}
                </div>
                <div className="font-extrabold text-xs">Industry / CSR</div>
                <div className={`text-[10px] line-clamp-2 leading-tight ${targetEntity === 'industry' ? 'text-purple-100' : 'text-[var(--ink-soft)]'}`}>
                  Corporate Grants, Private Funding, MSME Co-development
                </div>
              </button>
            </div>
          </div>

          {/* Issue Title */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Broken Water Pump in Angara Village"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-medium text-[var(--ink)] ${
                fieldErrors.title
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                  : 'border-[var(--line)] focus:ring-2 focus:ring-[var(--brand)]'
              }`}
            />
            {fieldErrors.title && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fieldErrors.title}
              </p>
            )}
          </div>

          {/* Problem Category Selection Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                <span>📋 Select Problem Category</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAiCategorize}
                disabled={aiSuggesting}
                className="text-[11px] font-extrabold text-[var(--brand)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--brand)]/10 px-2.5 py-1 rounded-lg"
              >
                {aiSuggesting ? '🤖 Analyzing Problem...' : '✨ AI Auto-Categorize'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setCategory(cat.value);
                      if (submitAttempted) validateForm(title, description, cat.value, district, area);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                      isSelected
                        ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-md ring-2 ring-[var(--brand)]/30 scale-[1.02]'
                        : 'bg-white text-[var(--ink)] border-[var(--line)] hover:border-[var(--brand)] hover:bg-[var(--bg)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{cat.icon}</span>
                      {isSelected && <span className="text-[10px] font-extrabold bg-white/20 px-1.5 py-0.5 rounded">✓ Selected</span>}
                    </div>
                    <div>
                      <div className="font-black text-xs leading-tight">{cat.label}</div>
                      <div className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-white/80' : 'text-[var(--ink-soft)]'}`}>
                        {cat.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {aiSuggestedCat && (
              <div className="mt-1.5 text-[11px] bg-teal-50 text-teal-800 font-bold px-3 py-1.5 rounded-xl border border-teal-200 inline-flex items-center gap-1.5">
                <span>🤖 AI Suggested:</span>
                <span className="underline">{CATEGORIES.find((c) => c.value === aiSuggestedCat)?.label || aiSuggestedCat}</span>
              </div>
            )}

            {fieldErrors.category && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fieldErrors.category}
              </p>
            )}
          </div>

          {/* District Selection */}
          <div>
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
                District <span className="text-red-500">*</span>
              </label>
              <select
                value={district}
                onChange={handleDistrictChange}
                className={`w-full px-4 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-medium text-[var(--ink)] ${
                  fieldErrors.district
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                    : 'border-[var(--line)] focus:ring-2 focus:ring-[var(--brand)]'
                }`}
              >
                <option value="">-- Select District --</option>
                {Object.keys(DISTRICT_CENTERS).map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
              {fieldErrors.district && (
                <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {fieldErrors.district}
                </p>
              )}
            </div>

          {/* Area / Locality Chip Picker (Driven by Map Pin reverse-geocoding) */}
          <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>📍 Area / Locality</span>
                <span className="text-red-500">*</span>
              </label>

              {localityLoading ? (
                <span className="text-[11px] text-purple-700 font-bold animate-pulse flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3 text-purple-700" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Detecting nearby localities from map pin...
                </span>
              ) : (
                <span className="text-[10px] text-[var(--ink-soft)] font-medium">
                  Pin Driven • Tap chip to select locality
                </span>
              )}
            </div>

            {localityChips.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {localityChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setArea(chip);
                        setShowCustomAreaInput(false);
                        if (submitAttempted) validateForm(title, description, category, district, chip);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        area === chip && !showCustomAreaInput
                          ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-purple-500 hover:bg-purple-50'
                      }`}
                    >
                      <span>📍</span>
                      <span>{chip}</span>
                      {area === chip && !showCustomAreaInput && <span className="text-xs">✓</span>}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowCustomAreaInput((prev) => !prev)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-slate-400 text-slate-600 hover:border-purple-600 hover:text-purple-700 transition-all cursor-pointer bg-white"
                  >
                    {showCustomAreaInput ? '✕ Hide Custom' : '✏️ Type Custom'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs font-medium">
                📍 No automatic locality chips detected for this pin. Please type custom locality below:
              </div>
            )}

            {(showCustomAreaInput || localityChips.length === 0) && (
              <div className="pt-2 border-t border-purple-100">
                <input
                  type="text"
                  value={area}
                  onChange={handleAreaChange}
                  placeholder="e.g. Doranda, Jaynagar, Main Market, Sector 4"
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all font-medium text-[var(--ink)] ${
                    fieldErrors.area
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-[var(--line)] focus:ring-2 focus:ring-purple-500'
                  }`}
                />
              </div>
            )}

            {fieldErrors.area && (
              <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fieldErrors.area}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Describe the issue, impact on local population, and how long it has been persisting (minimum 10 characters)..."
              className={`w-full px-4 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-medium text-[var(--ink)] resize-none ${
                fieldErrors.description
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                  : 'border-[var(--line)] focus:ring-2 focus:ring-[var(--brand)]'
              }`}
            />
            {fieldErrors.description && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Submitter Type */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-2">
              Reporting As
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'citizen', label: 'Citizen' },
                { value: 'panchayat', label: 'Panchayat Rep' },
                { value: 'ulb', label: 'ULB Official' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSubmitterType(type.value)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    submitterType === type.value
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-md'
                      : 'bg-white text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--brand)]'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location Picker Map & Geo Coordinates */}
          <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Interactive Location Pinpoint (Map)
                </label>
                <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                  Drag the pin on the map or tap any location to set exact issue coordinates.
                </p>
              </div>

              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="text-xs font-extrabold text-white bg-[var(--brand)] px-3 py-1.5 rounded-xl hover:bg-[var(--brand-deep)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {geoLoading ? (
                  <span>Detecting GPS...</span>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.312-2.841-.873-4.084" />
                    </svg>
                    Detect My GPS
                  </>
                )}
              </button>
            </div>

            {gpsWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2.5 shadow-sm animate-fadeIn">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="leading-tight">
                  <span className="font-bold block mb-0.5 text-amber-950">Location Warning</span>
                  <span>{gpsWarning}</span>
                </div>
              </div>
            )}

            {/* Leaflet Map Component */}
            <LocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onChangeLocation={(newLat, newLng) => {
                setLatitude(newLat);
                setLongitude(newLng);
              }}
            />

            {/* Read-only Coordinates Display */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-[var(--line)]">
              <div>
                <span className="block text-[var(--ink-soft)] font-bold text-[10px] uppercase mb-0.5">Selected Latitude</span>
                <input
                  type="text"
                  readOnly
                  value={latitude}
                  className="w-full bg-gray-50 text-[var(--ink)] font-mono text-xs font-extrabold px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <span className="block text-[var(--ink-soft)] font-bold text-[10px] uppercase mb-0.5">Selected Longitude</span>
                <input
                  type="text"
                  readOnly
                  value={longitude}
                  className="w-full bg-gray-50 text-[var(--ink)] font-mono text-xs font-extrabold px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Attach Photo Evidence <span className="text-[var(--ink-soft)] font-normal">(Optional)</span>
            </label>

            {photoPreview ? (
              <div className="relative inline-block mt-1">
                <img
                  src={photoPreview}
                  alt="Issue preview"
                  className="h-36 w-48 object-cover rounded-2xl border border-[var(--line)] shadow-md"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-colors cursor-pointer"
                  title="Remove photo"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--line)] border-dashed rounded-2xl hover:border-[var(--brand)] transition-all cursor-pointer bg-white/50">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-10 w-10 text-[var(--ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex text-xs text-[var(--ink-soft)]">
                    <span className="font-bold text-[var(--brand)]">Upload a photo</span>
                    <span className="pl-1">or drag and drop</span>
                  </div>
                  <p className="text-[10px] text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[var(--line)]">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-accent py-4 px-6 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Submitting Issue to Supabase...</span>
                </>
              ) : (
                <>
                  <span>Submit Issue Report</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
