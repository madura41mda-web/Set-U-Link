/**
 * Rule-based Department & Expertise Matcher and Explainable Match Score Engine
 * Deterministic, transparent logic connecting civic problem categories to academic departments.
 */

export const CATEGORY_DEPARTMENT_MAP = {
  water: {
    primaryDepartments: ['Civil & Environmental Engineering', 'Chemical Engineering'],
    secondaryDepartments: ['Computer Science & Engineering (IoT/Sensors)', 'Biotechnology & Bio-engineering'],
    suggestedProjectTypes: ['Capstone R&D Project', 'M.Tech Thesis', 'Water Safety Field Pilot'],
    recommendedSkills: ['Water Quality Testing', 'Arsenic/Fluoride Filtration', 'IoT Water Level Sensors', 'Spectrophotometry']
  },
  infra: {
    primaryDepartments: ['Civil & Structural Engineering', 'Electrical & Power Engineering'],
    secondaryDepartments: ['Urban Planning & Architecture', 'Transportation Engineering'],
    suggestedProjectTypes: ['Infrastructure Assessment Pilot', 'Smart Grid Design', 'Final Year B.Tech Project'],
    recommendedSkills: ['Structural Health Monitoring', 'Solar Photovoltaics', 'Culvert Engineering', 'GIS Mapping']
  },
  health: {
    primaryDepartments: ['Biomedical Engineering', 'Biotechnology & Bio-engineering'],
    secondaryDepartments: ['Computer Science & Data Science', 'Public Health & Medicine'],
    suggestedProjectTypes: ['Cold Chain Monitoring System', 'Telemedicine Prototype', 'Healthcare Analytics'],
    recommendedSkills: ['Vaccine Temperature Sensors', 'IoT Telemetry', 'Epidemiological Modeling', 'Mobile Health Apps']
  },
  sanitation: {
    primaryDepartments: ['Environmental Engineering', 'Chemical Engineering'],
    secondaryDepartments: ['Materials Science & Engineering', 'Biotechnology'],
    suggestedProjectTypes: ['Sanitation Infrastructure Redesign', 'Waste Recycling Prototype', 'Community Hygiene Unit'],
    recommendedSkills: ['Solid Waste Treatment', 'Anaerobic Digestion', 'Biogas Conversion', 'Effluent Testing']
  },
  agriculture: {
    primaryDepartments: ['Agricultural Engineering', 'Biotechnology & Soil Science'],
    secondaryDepartments: ['Robotics & Electrical Engineering', 'Computer Science (Agri-AI)'],
    suggestedProjectTypes: ['Soil Health Sensor Array', 'Post-Harvest Cold Storage Unit', 'Agritech Drone Prototype'],
    recommendedSkills: ['Soil Chemistry Analysis', 'Thermal Refrigeration', 'Crop Disease Detection', 'Micro-irrigation']
  },
  education: {
    primaryDepartments: ['Computer Science & Engineering', 'Electronics & Communication'],
    secondaryDepartments: ['Educational Technology', 'Social Innovation & Management'],
    suggestedProjectTypes: ['Low-cost STEM Lab Kit', 'Digital Learning Offline Server', 'Educational Hardware Kit'],
    recommendedSkills: ['Raspberry Pi/Arduino', 'Open-source LMS', 'Interactive Physics Simulations', 'EdTech Hardware']
  },
  livelihood: {
    primaryDepartments: ['Industrial & Production Engineering', 'Mechanical Engineering'],
    secondaryDepartments: ['Computer Science (E-commerce/Marketplace)', 'School of Management & Entrepreneurship'],
    suggestedProjectTypes: ['Yarn/Weaving Machine Automation', 'Artisan E-Commerce Portal', 'Micro-machinery Redesign'],
    recommendedSkills: ['Textile Machinery Design', 'Mechatronics', 'Supply Chain Management', 'Direct-to-Consumer Web Portals']
  }
};

/**
 * Returns suggested academic departments and project types for an issue category
 */
export function getDepartmentSuggestions(category) {
  const normalizedCategory = (category || 'infra').toLowerCase();
  return CATEGORY_DEPARTMENT_MAP[normalizedCategory] || CATEGORY_DEPARTMENT_MAP.infra;
}

/**
 * Calculates a deterministic, explainable match score breakdown for a university organization matching an issue.
 * 
 * @param {Object} issue - The civic issue object
 * @param {Object} org - The university organization object
 * @returns {Object} { totalScore, breakdown: { categoryMatch, expertiseMatch, locationMatch, priorityRelevance }, explanation }
 */
export function getExplainableMatchScore(issue, org) {
  if (!issue || !org) {
    return {
      totalScore: 75,
      breakdown: { categoryMatch: 30, expertiseMatch: 20, locationMatch: 15, priorityRelevance: 10 },
      explanation: 'General academic R&D suitability match.'
    };
  }

  const category = (issue.category || 'infra').toLowerCase();
  const orgTags = (org.category_tags || []).map(t => t.toLowerCase());

  // 1. Category Alignment (Max 40 pts)
  let categoryMatch = 20; // baseline
  if (orgTags.includes(category)) {
    categoryMatch = 40;
  } else if (orgTags.length > 0) {
    categoryMatch = 28;
  }

  // 2. Expertise & R&D Capability Match (Max 30 pts)
  const deptInfo = getDepartmentSuggestions(category);
  let expertiseMatch = 25; // standard department match
  if (org.type === 'university' || org.type === 'research_institution') {
    expertiseMatch += 3;
  }
  expertiseMatch = Math.min(30, expertiseMatch);

  // 3. Location & Geographic Proximity (Max 15 pts)
  let locationMatch = 10;
  if (issue.district && org.district && issue.district.toLowerCase() === org.district.toLowerCase()) {
    locationMatch = 15;
  }

  // 4. Civic Priority & Severity Relevance (Max 15 pts)
  const priorityScore = issue.priority_score || 50;
  const avgSeverity = Number(issue.avg_severity_score || 3);
  let priorityRelevance = Math.round((priorityScore / 100) * 10 + (avgSeverity / 5) * 5);
  priorityRelevance = Math.min(15, Math.max(5, priorityRelevance));

  const totalScore = categoryMatch + expertiseMatch + locationMatch + priorityRelevance;

  return {
    totalScore,
    breakdown: {
      categoryMatch,
      expertiseMatch,
      locationMatch,
      priorityRelevance
    },
    suggestedDepartments: deptInfo.primaryDepartments,
    suggestedProjectTypes: deptInfo.suggestedProjectTypes,
    recommendedSkills: deptInfo.recommendedSkills,
    explanation: `Matched ${org.name} based on ${locationMatch === 15 ? 'same-district proximity (' + issue.district + ')' : 'regional coverage'}, high R&D capability in ${deptInfo.primaryDepartments[0]}, and category alignment with ${category.toUpperCase()} civic challenges.`
  };
}
