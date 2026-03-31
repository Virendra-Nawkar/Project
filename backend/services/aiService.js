const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

async function callOpenRouter(systemPrompt, userPrompt, maxTokens = 4096) {
  const response = await axios.post(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'StudyTree LMS'
      },
      timeout: 120000
    }
  );
  return response.data.choices[0].message.content;
}

async function formatTranscript(rawTranscript) {
  const systemPrompt = `You are a transcript formatter. Format the provided raw transcript into clean, readable markdown.
Fix punctuation, add paragraph breaks, and improve readability. Keep all content intact.
Return only the formatted markdown text.`;

  const userPrompt = `Format this transcript:\n\n${rawTranscript.substring(0, 8000)}`;
  return await callOpenRouter(systemPrompt, userPrompt, 4096);
}

async function generateSummary(transcript) {
  const systemPrompt = `You are an educational content summarizer. Create a comprehensive summary of the lecture transcript.
Use markdown format with ## headings for main topics and bullet points for key details.
Include: main topics covered, key concepts, important takeaways.`;

  const userPrompt = `Summarize this lecture transcript:\n\n${transcript.substring(0, 8000)}`;
  return await callOpenRouter(systemPrompt, userPrompt, 2048);
}

async function generateQuiz(transcript) {
  const systemPrompt = `You are an educational quiz generator. Create exactly 5 multiple choice questions based on the lecture content.
Return ONLY valid JSON in this exact format, no other text:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}
correctAnswer is the 0-based index of the correct option. Shuffle the options.`;

  const userPrompt = `Generate a quiz for this lecture:\n\n${transcript.substring(0, 6000)}`;
  const response = await callOpenRouter(systemPrompt, userPrompt, 2048);

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON found in quiz response');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions || [];
}

async function detectSlideTimestamps(transcript) {
  const systemPrompt = `You are analyzing a lecture transcript to detect slide change points.
Identify timestamps (in seconds) where a new slide or major topic begins.
Return ONLY a JSON array of numbers representing seconds, like: [0, 45, 120, 180, 240]
Include at least the start (0) and major topic transitions.`;

  const userPrompt = `Detect slide transition timestamps from this transcript:\n\n${transcript.substring(0, 6000)}`;

  try {
    const response = await callOpenRouter(systemPrompt, userPrompt, 512);
    const jsonMatch = response.match(/\[[\d,\s]+\]/);
    if (!jsonMatch) return null;

    const timestamps = JSON.parse(jsonMatch[0]);
    return timestamps.filter(t => typeof t === 'number' && t >= 0);
  } catch {
    return null;
  }
}

async function chatWithLecture(transcript, chatHistory, userMessage) {
  const systemPrompt = `You are a helpful study assistant for a lecture. Answer questions based on the lecture transcript provided.
Be concise, accurate, and educational. If something is not covered in the transcript, say so clearly.

Lecture Transcript:
${transcript.substring(0, 6000)}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await axios.post(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 1024
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'StudyTree LMS'
      },
      timeout: 60000
    }
  );
  return response.data.choices[0].message.content;
}

module.exports = { formatTranscript, generateSummary, generateQuiz, detectSlideTimestamps, chatWithLecture };
