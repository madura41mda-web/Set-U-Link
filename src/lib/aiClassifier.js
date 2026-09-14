const VALID_CATEGORIES = [
  'education',
  'health',
  'water',
  'sanitation',
  'infra',
  'agriculture',
  'livelihood',
];

const KEYWORD_MAP = {
  water: ['water', 'pipe', 'borewell', 'leak', 'fluoride', 'drinking', 'contamination', 'handpump', 'well', 'tank'],
  health: ['doctor', 'hospital', 'vaccine', 'medicine', 'health', 'phc', 'clinic', 'ambulance', 'patient', 'medical'],
  education: ['school', 'teacher', 'student', 'classroom', 'books', 'education', 'bench', 'blackboard', 'study'],
  sanitation: ['garbage', 'trash', 'waste', 'drain', 'sewage', 'toilet', 'sanitation', 'cleanliness', 'hygiene'],
  infra: ['road', 'bridge', 'culvert', 'pothole', 'electricity', 'transformer', 'street light', 'collapsed', 'building', 'infra'],
  agriculture: ['crop', 'farmer', 'storage', 'irrigation', 'drought', 'seed', 'fertilizer', 'farm', 'paddy', 'tomato'],
  livelihood: ['job', 'employment', 'skill', 'wage', 'training', 'livelihood', 'artisan', 'self help', 'income'],
};

/**
 * Categorizes an issue using GROQ LLM with fast 2.5s timeout & offline keyword fallback.
 */
export async function classifyIssueCategory(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase().trim();
  if (!text) return 'water';

  const groqApiKey = import.meta.env?.VITE_GROQ_API_KEY;

  if (groqApiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'You are a civic issue classifier for SetuLink. Analyze the title and description and respond ONLY with one of these category keys: education, health, water, sanitation, infra, agriculture, livelihood. Output no punctuation, explanation, or extra characters.',
            },
            {
              role: 'user',
              content: `Title: ${title}\nDescription: ${description}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const suggested = json?.choices?.[0]?.message?.content?.trim()?.toLowerCase();
        if (suggested && VALID_CATEGORIES.includes(suggested)) {
          console.log(`🤖 GROQ AI suggested category: ${suggested}`);
          return suggested;
        }
      }
    } catch (err) {
      console.warn('GROQ API classification timed out or failed, using heuristic fallback:', err);
    }
  }

  // Offline Heuristic Keyword Classifier
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) {
      console.log(`🧠 Heuristic AI suggested category: ${cat}`);
      return cat;
    }
  }

  return 'water';
}
