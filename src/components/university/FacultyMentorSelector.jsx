import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

export const DEMO_FACULTY_ROSTER = [
  {
    id: 'f1111111-1111-4111-a111-111111111101',
    name: 'Dr. Alok Kumar Sharma',
    title: 'Professor & HOD',
    department: 'Department of Civil & Environmental Engineering',
    email: 'aksharma@bitmesra.ac.in',
    expertise: ['Water Purification', 'Arsenic Remediation', 'Sensors']
  },
  {
    id: 'f2222222-2222-4222-a222-222222222202',
    name: 'Prof. Sunita Mukherjee',
    title: 'Associate Professor',
    department: 'Department of Computer Science & Engineering',
    email: 'smukherjee@bitmesra.ac.in',
    expertise: ['IoT & Embedded Systems', 'AI & Machine Learning', 'Data Telemetry']
  },
  {
    id: 'f3333333-3333-4333-a333-333333333303',
    name: 'Dr. Ramesh Chandra Mahato',
    title: 'Professor & R&D Coordinator',
    department: 'Department of Biotechnology & Bio-engineering',
    email: 'rcmahato@bitmesra.ac.in',
    expertise: ['Water Microbiology', 'Soil Science', 'Agricultural Biotech']
  },
  {
    id: 'f4444444-4444-4444-a444-444444444404',
    name: 'Dr. Priya Ranjan Das',
    title: 'Assistant Professor',
    department: 'Department of Mechanical Engineering',
    email: 'prdas@bitmesra.ac.in',
    expertise: ['Renewable Energy', 'Solar Mini-grids', 'Automation']
  }
];

export default function FacultyMentorSelector({ orgId, selectedMentorId, onSelectMentor }) {
  const [mentors, setMentors] = useState(DEMO_FACULTY_ROSTER);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFaculty() {
      if (!orgId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('faculty_mentors')
          .select('*')
          .eq('org_id', orgId);

        if (!error && data && data.length > 0) {
          setMentors(data);
        }
      } catch (err) {
        console.warn('Faculty mentors fetch warning:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFaculty();
  }, [orgId]);

  const selectedMentor = mentors.find(m => m.id === selectedMentorId) || mentors[0];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
        👨‍🏫 Faculty Mentor Assignment:
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mentors.map((mentor) => {
          const isSelected = mentor.id === selectedMentor?.id;
          return (
            <div
              key={mentor.id}
              onClick={() => onSelectMentor(mentor)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/30 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-xs text-[var(--ink)] flex items-center gap-1.5">
                    <span>👨‍🏫</span> {mentor.name}
                  </div>
                  <div className="text-[11px] font-semibold text-purple-900">{mentor.title}</div>
                </div>
                {isSelected && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]">
                    Assigned
                  </span>
                )}
              </div>

              <div className="text-[10px] font-medium text-[var(--ink-soft)] leading-tight">
                {mentor.department}
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {(mentor.expertise || []).map((exp, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-semibold border border-slate-200"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
