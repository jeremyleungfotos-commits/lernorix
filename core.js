import { ACTIVITY_TYPES, validateActivity, isActivity, gradeActivity, prepareQuestion } from './activities.js';
export const LEVELS = { '1': 'Leicht', '2': 'Mittel', '3': 'Schwer' };
export const TYPES = { text: 'Kurzantwort', sequence: ACTIVITY_TYPES.sequence, hotspot: ACTIVITY_TYPES.hotspot, open: 'Freie Erklärung / Bildanalyse', choice: 'Einfachauswahl', ...ACTIVITY_TYPES };
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const normalize = value => String(value ?? '').trim().toLocaleLowerCase('de-CH').replace(/\s+/g, ' ');
export const percent = (n, total) => total ? Math.round(n / total * 100) : 0;
export function safeURL(value, image = false) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (image && /^assets\/[a-zA-Z0-9_./ -]+$/.test(value) && !value.includes('..')) return value;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function validateCourse(course) {
  if (!course || typeof course.id !== 'string' || !/^[a-z0-9-]+$/.test(course.id) || !Number.isInteger(course.revision) || course.revision < 1) throw new Error('The course needs a stable ID and positive revision.');
  for (const key of ['title', 'subject', 'description', 'examDate']) if (typeof course[key] !== 'string') throw new Error(`Invalid course ${key}.`);
  for (const key of ['topics', 'questions', 'flashcards']) if (!Array.isArray(course[key])) throw new Error(`Missing ${key} array.`);
  const topicIds = new Set();
  for (const topic of course.topics) {
    if (!topic.id || topicIds.has(topic.id) || !topic.title?.trim() || !Array.isArray(topic.blocks) || !Array.isArray(topic.sources)) throw new Error('Invalid or duplicate learning objective.');
    topicIds.add(topic.id);
    for (const block of topic.blocks) {
      if (!['text', 'image', 'steps', 'callout', 'check'].includes(block.type)) throw new Error('Unknown lesson block.');
      if (block.type === 'image' && (!safeURL(block.src, true) || !block.alt)) throw new Error('An image needs a safe URL and alt text.');
      if (block.type === 'steps' && (!Array.isArray(block.items) || !block.items.every(item => typeof item === 'string'))) throw new Error('Steps need text items.');
      if (block.type === 'check' && (!block.prompt || !block.answer)) throw new Error('A self-check needs a question and answer.');
    }
    for (const source of topic.sources) if (!source.title || !safeURL(source.url)) throw new Error('A source needs a title and safe URL.');
  }
  const ids = new Set();
  for (const question of course.questions) {
    if (!question.id || ids.has(question.id) || !topicIds.has(question.topicId) || !TYPES[question.type] || !LEVELS[question.level] || !question.prompt?.trim()) throw new Error('Invalid or duplicate question.');
    ids.add(question.id);
    validateActivity(question);
    if (question.media) {
      const media = Array.isArray(question.media) ? question.media : [question.media];
      if (!media.length || media.length > 4 || media.some(item => !item || !safeURL(item.src, true) || typeof item.alt !== 'string' || !item.alt.trim())) throw new Error('Question media needs safe URLs and alt text (one to four images).');
    }
    if (question.type === 'choice' && (!Array.isArray(question.options) || question.options.length < 2 || !question.options.every(x => typeof x === 'string') || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length)) throw new Error('Invalid choice answer.');
    if (question.type === 'text' && (!Array.isArray(question.answers) || !question.answers.length || !question.answers.every(x => typeof x === 'string' && x.trim()))) throw new Error('A short answer needs accepted answers.');
    if (question.type === 'open' && (!question.sample || !Array.isArray(question.criteria) || !question.criteria.length)) throw new Error('An open question needs a sample and criteria.');
  }
  const cardIds = new Set();
  for (const card of course.flashcards) {
    if (!card.id || cardIds.has(card.id) || !topicIds.has(card.topicId) || !card.front || !card.back) throw new Error('Invalid flashcard.');
    cardIds.add(card.id);
  }
  return course;
}
export function filterQuestions(questions, { topicIds, level = 'all', type = 'all', weakOnly = false, attempts = {} }) {
  return questions.filter(q => topicIds.includes(q.topicId) && (level === 'all' || String(q.level) === String(level)) && (type === 'all' || q.type === type) && (!weakOnly || [0, 0.5].includes(attempts[q.id]?.score)));
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function createSession(course, options, now = Date.now()) {
  const available = filterQuestions(course.questions, options);
  const count = Math.max(1, Math.min(100, Number(options.count) || 10));
  // Rotate shuffled type buckets so mixed rounds cover different interactions first.
  const buckets = shuffle([...new Set(available.map(q => q.type))]).map(type => shuffle(available.filter(q => q.type === type)));
  const selected = [];
  while (selected.length < count && buckets.some(bucket => bucket.length)) {
    for (const bucket of buckets) if (bucket.length && selected.length < count) selected.push(bucket.shift());
  }
  const questions = selected.map(q => prepareQuestion(q));
  if (!questions.length) return null;
  return { id: String(now), mode: options.mode, level: options.level, createdAt: now, deadline: options.minutes > 0 ? now + options.minutes * 60000 : null, questions, answers: {}, results: {}, index: 0, submitted: false };
}
export function grade(question, answer) {
  if (question.type === 'open') return null;
  if (isActivity(question)) return gradeActivity(question, answer);
  if (question.type === 'choice') return String(question.answer) === String(answer ?? '') ? 1 : 0;
  return question.answers.some(a => normalize(a) === normalize(answer)) ? 1 : 0;
}
export function newProgress() { return { read: {}, notes: {}, attempts: {}, exams: [], session: null }; }
export function recordResult(progress, question, answer, score, now = Date.now()) {
  if (![0, 0.5, 1].includes(score)) return;
  const previous = progress.attempts[question.id];
  progress.attempts[question.id] = { score, answer: String(answer ?? ''), count: (previous?.count || 0) + 1, at: now, selfAssessed: question.type === 'open' };
}
export function topicStats(course, progress, topicId) {
  const questions = course.questions.filter(q => !topicId || q.topicId === topicId);
  const answered = questions.filter(q => progress.attempts[q.id]);
  const correct = answered.reduce((sum, q) => sum + progress.attempts[q.id].score, 0);
  return { total: questions.length, answered: answered.length, correct, coverage: percent(answered.length, questions.length), accuracy: percent(correct, answered.length) };
}
export function validateProgress(value, course) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.exams)) throw new Error('Invalid progress.');
  for (const key of ['read', 'notes', 'attempts']) if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])) throw new Error('Invalid progress.');
  const clean = newProgress();
  for (const topic of course.topics) {
    if (value.read[topic.id] === true) clean.read[topic.id] = true;
    if (typeof value.notes[topic.id] === 'string') clean.notes[topic.id] = value.notes[topic.id].slice(0, 20000);
  }
  for (const q of course.questions) {
    const entry = value.attempts[q.id];
    if (entry && [0, 0.5, 1].includes(entry.score) && Number.isInteger(entry.count) && entry.count > 0 && Number.isFinite(entry.at)) clean.attempts[q.id] = { score: entry.score, count: entry.count, at: entry.at, answer: String(entry.answer ?? '').slice(0, 20000), selfAssessed: q.type === 'open' };
  }
  clean.exams = value.exams.filter(e => e && typeof e.id === 'string' && Number.isFinite(e.at) && Number.isInteger(e.total) && e.total > 0 && Number.isFinite(e.score) && e.score >= 0 && e.score <= e.total).slice(-50);
  // Session snapshots are restored only if their question IDs and ordering are valid.
  const s = value.session;
  if (s && ['exam', 'practice'].includes(s.mode) && typeof s.id === 'string' && Number.isFinite(s.createdAt) && (s.deadline === null || Number.isFinite(s.deadline)) && Array.isArray(s.questions) && s.questions.length && s.questions.length <= 100 && new Set(s.questions.map(q => q.id)).size === s.questions.length && s.answers && typeof s.answers === 'object' && s.results && typeof s.results === 'object') {
    const current = new Map(course.questions.map(q => [q.id, q]));
    if (s.questions.every(q => current.has(q.id))) {
      const questions = s.questions.map(q => prepareQuestion(current.get(q.id), q));
      const answers = {}, results = {};
      for (const q of questions) {
        if (typeof s.answers[q.id] === 'string' || typeof s.answers[q.id] === 'number') answers[q.id] = String(s.answers[q.id]).slice(0, 20000);
        if ([0, 0.5, 1].includes(s.results[q.id])) results[q.id] = s.results[q.id];
      }
      clean.session = { id: s.id, mode: s.mode, level: LEVELS[s.level] ? String(s.level) : 'all', createdAt: s.createdAt, deadline: s.deadline, questions, answers, results, index: Math.max(0, Math.min(questions.length - 1, Number.isInteger(s.index) ? s.index : 0)), submitted: s.submitted === true, preview: s.preview === true, started: s.started === true, plannedMinutes: [0, 15, 30, 45, 60].includes(s.plannedMinutes) ? s.plannedMinutes : 0 };
    }
  }
  return clean;
}
