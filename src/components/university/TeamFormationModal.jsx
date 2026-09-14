import React, { useState } from 'react';
import FacultyMentorSelector, { DEMO_FACULTY_ROSTER } from './FacultyMentorSelector.jsx';
import { supabase } from '../../lib/supabaseClient.js';

export default function TeamFormationModal({ issue, orgDetails, onClose, onTeamCreated }) {
  const [teamName, setTeamName] = useState(`R&D Team — ${issue?.title ? issue.title.slice(0, 25) : 'Civic Solution'}`);
  const [selectedMentor, setSelectedMentor] = useState(DEMO_FACULTY_ROSTER[0]);
  const [selectedDepts, setSelectedDepts] = useState([
    'Civil & Environmental Engineering',
    'Computer Science & Engineering'
  ]);
  const [saving, setSaving] = useState(false);

  const [studentMembers, setStudentMembers] = useState([
    {
      student_name: 'Rahul Sharma',
      roll_number: 'BTECH/10542/22',
      department: 'Civil & Environmental Engineering',
      role: 'Team Lead & Field Analyst',
      skills: 'Water Quality Testing, CAD, Site Survey'
    },
    {
      student_name: 'Priya Kumari',
      roll_number: 'BTECH/10891/22',
      department: 'Computer Science & Engineering',
      role: 'Hardware & IoT Developer',
      skills: 'Arduino, Sensor Calibration, Node.js'
    }
  ]);

  const AVAILABLE_DEPTS = [
    'Civil & Environmental Engineering',
    'Computer Science & Engineering',
    'Biotechnology & Bio-engineering',
    'Mechanical Engineering',
    'Electrical & Power Systems',
    'Chemical Engineering'
  ];

  const handleAddMember = () => {
    setStudentMembers([
      ...studentMembers,
      {
        student_name: '',
        roll_number: '',
        department: AVAILABLE_DEPTS[0],
        role: 'Research Assistant',
        skills: ''
      }
    ]);
  };

  const handleUpdateMember = (index, field, value) => {
    const updated = [...studentMembers];
    updated[index][field] = value;
    setStudentMembers(updated);
  };

  const handleRemoveMember = (index) => {
    setStudentMembers(studentMembers.filter((_, i) => i !== index));
  };

  const handleToggleDept = (dept) => {
    if (selectedDepts.includes(dept)) {
      if (selectedDepts.length > 1) {
        setSelectedDepts(selectedDepts.filter((d) => d !== dept));
      }
    } else {
      setSelectedDepts([...selectedDepts, dept]);
    }
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;
    try {
      setSaving(true);

      const newTeam = {
        id: `team-${Date.now()}`,
        issue_id: issue.id,
        org_id: orgDetails?.id || 'demo-org-id',
        team_name: teamName,
        departments: selectedDepts,
        faculty_mentor_id: selectedMentor?.id,
        faculty_mentor: selectedMentor,
        student_members: studentMembers.filter((m) => m.student_name.trim())
      };

      // Try persisting to DB
      try {
        const { data: teamDbData } = await supabase.from('project_teams').insert([
          {
            issue_id: issue.id,
            org_id: orgDetails?.id,
            team_name: teamName,
            departments: selectedDepts,
            faculty_mentor_id: selectedMentor?.id
          }
        ]).select().single();

        if (teamDbData && studentMembers.length > 0) {
          const membersToInsert = studentMembers
            .filter((m) => m.student_name.trim())
            .map((m) => ({
              team_id: teamDbData.id,
              student_name: m.student_name,
              roll_number: m.roll_number,
              department: m.department,
              role: m.role,
              skills: m.skills.split(',').map((s) => s.trim())
            }));
          await supabase.from('team_members').insert(membersToInsert);
        }
      } catch (dbErr) {
        console.warn('DB persistence fallback:', dbErr);
      }

      onTeamCreated(newTeam);
      onClose();
    } catch (err) {
      console.error('Error saving team:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[var(--line)] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                Multidisciplinary Team Formation
              </span>
            </div>
            <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
              Create Project R&D Team
            </h2>
            <p className="text-xs text-[var(--ink-soft)] font-medium mt-0.5">
              Challenge: <strong className="text-[var(--ink)]">{issue?.title}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Inputs */}
        <div className="space-y-5">
          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Project Team Name:
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. AquaShield R&D Team"
              className="w-full text-xs font-bold p-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Select Participating Departments:
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_DEPTS.map((dept) => {
                const active = selectedDepts.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => handleToggleDept(dept)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      active
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                    }`}
                  >
                    {active ? '✓ ' : '+ '} {dept}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Faculty Mentor Selector */}
          <FacultyMentorSelector
            orgId={orgDetails?.id}
            selectedMentorId={selectedMentor?.id}
            onSelectMentor={(mentor) => setSelectedMentor(mentor)}
          />

          {/* Student Members List */}
          <div className="space-y-3 pt-3 border-t border-[var(--line)]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Student R&D Team Members:
              </label>
              <button
                type="button"
                onClick={handleAddMember}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer"
              >
                + Add Student Member
              </button>
            </div>

            <div className="space-y-3">
              {studentMembers.map((member, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-900">
                      Member #{idx + 1}
                    </span>
                    {studentMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Student Full Name"
                      value={member.student_name}
                      onChange={(e) => handleUpdateMember(idx, 'student_name', e.target.value)}
                      className="text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Roll / Student ID (e.g. BTECH/10542/22)"
                      value={member.roll_number}
                      onChange={(e) => handleUpdateMember(idx, 'roll_number', e.target.value)}
                      className="text-xs font-medium p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none"
                    />
                    <select
                      value={member.department}
                      onChange={(e) => handleUpdateMember(idx, 'department', e.target.value)}
                      className="text-xs font-medium p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none"
                    >
                      {AVAILABLE_DEPTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Team Role (e.g. Team Lead, IoT Eng.)"
                      value={member.role}
                      onChange={(e) => handleUpdateMember(idx, 'role', e.target.value)}
                      className="text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Skills / Responsibilities (comma separated)"
                    value={member.skills}
                    onChange={(e) => handleUpdateMember(idx, 'skills', e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[var(--line)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveTeam}
            disabled={saving || !teamName.trim()}
            className="px-6 py-2.5 rounded-xl font-black text-xs text-white bg-purple-600 hover:bg-purple-700 border border-purple-700 shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Creating Team...' : 'Form Team & Assign Mentor'}
          </button>
        </div>

      </div>
    </div>
  );
}
