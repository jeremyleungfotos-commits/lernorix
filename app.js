import {isActivity,hasAnswer,activitySolution,activityAnswerLabel} from './activities.js';
import {renderActivity,readActivity,renderHotspots,activityAction,activityPrint,moveSequence} from './activity-ui.js';
import course from './course.js';
import { LEVELS, TYPES, escapeHTML as e, percent, safeURL, validateCourse, filterQuestions, createSession, grade, newProgress, recordResult, topicStats, validateProgress } from './core.js';

const $ = selector => document.querySelector(selector);
const icons = {
  home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  pen: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
  exam: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
  chart: '<path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  print: '<path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7ZM17 11h1"/>',
  cards: '<rect x="7" y="6" width="13" height="15" rx="2"/><path d="M4 17V3h12m-6 8h7m-7 4h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  link: '<path d="m10 13 4-4m-6 2-3 3a4 4 0 0 0 6 6l3-3m-4-10 3-3a4 4 0 0 1 6 6l-3 3"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const art = (mini = false) => mini
  ? '<svg class="mini-art" viewBox="0 0 150 115" fill="none" aria-hidden="true"><ellipse cx="76" cy="99" rx="58" ry="7" fill="currentColor" opacity=".06"/><rect x="47" y="13" width="64" height="77" rx="6" transform="rotate(10 47 13)" fill="currentColor" opacity=".09"/><rect x="32" y="13" width="66" height="78" rx="6" fill="var(--surface)" stroke="currentColor" stroke-opacity=".5"/><path d="M46 33h36m-36 12h29M46 58h36m-36 12h20" stroke="currentColor" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/><circle cx="105" cy="78" r="19" fill="var(--accent-bg)" stroke="currentColor" stroke-opacity=".3"/><path d="M98 78h14m-7-7v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m17 27 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="currentColor" opacity=".4"/></svg>'
  : '<svg class="art" viewBox="0 0 280 260" fill="none" aria-hidden="true"><circle cx="150" cy="135" r="102" stroke="white" stroke-opacity=".06"/><circle cx="150" cy="135" r="75" stroke="white" stroke-opacity=".04"/><ellipse cx="143" cy="229" rx="99" ry="12" fill="black" opacity=".13"/><path d="m45 184 91-34 103 39-88 40Z" fill="currentColor" opacity=".8"/><path d="m45 174 91-33 103 38-88 41Z" fill="#e5e5e8"/><path d="m45 169 91-33 103 39-88 40Z" fill="#faf6f0"/><path d="m65 150 70-26 93 32-73 31Z" fill="currentColor" opacity=".35"/><rect x="94" y="47" width="102" height="123" rx="8" transform="rotate(9 94 47)" fill="currentColor"/><rect x="74" y="43" width="99" height="125" rx="8" transform="rotate(-8 74 43)" fill="#faf6f0"/><path d="m88 67 45-6m-43 21 57-8m-55 23 57-8m-54 23 32-5" stroke="#9095a2" stroke-width="4" stroke-linecap="round"/><rect x="147" y="104" width="52" height="52" rx="12" transform="rotate(8 147 104)" fill="currentColor"/><path d="m155 131 8 10 19-18" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="m209 55 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z" fill="currentColor"/><circle cx="58" cy="117" r="4" fill="currentColor" opacity=".6"/><path d="m215 145 8-3m-4-3 3 8" stroke="white" stroke-opacity=".4" stroke-width="2"/></svg>';

const storageKey = `lernorix:course:${course.id}:${course.revision}`;
let storageOK = true;
let progress = newProgress();
let settings = { theme: 'light', color: 'orange' };
let loadMessage = '';
try { validateCourse(course); } catch (error) {
  $('#main').textContent = `Die Lerninhalte konnten nicht geladen werden: ${error.message}`;
  throw error;
}
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) { try { progress = validateProgress(JSON.parse(saved), course); } catch { loadMessage = 'Gespeicherte Daten sind beschädigt. Sie wurden nicht überschrieben. Sichere sie vor einem Neustart über deinen Browser.'; storageOK = false; } }
  const savedSettings = JSON.parse(localStorage.getItem('lernorix:settings') || '{}');
  if (['light', 'dark'].includes(savedSettings.theme)) settings.theme = savedSettings.theme;
  if (['orange', 'blue', 'green', 'violet'].includes(savedSettings.color)) settings.color = savedSettings.color;
} catch { storageOK = false; }
let view = 'home';
let topicId = course.topics[0]?.id;
let cardIndex = 0;
let cardFlipped = false;
let categorySelection = { questionId: null, index: null };
let toastTimeout;
const topicTitle = id => course.topics.find(t => t.id === id)?.title || '';
const topicLink = id => `#learn/${encodeURIComponent(id)}`;
const btn = (label, action, value = '', style = '') => `<button class="btn ${style}" data-action="${action}" data-value="${e(value)}">${label}</button>`;
const heading = (title, description, eyebrow = course.subject || 'Dein Lernraum') => `<div class="intro"><div><div class="eyebrow">${e(eyebrow)}</div><h1>${e(title)}</h1><p>${e(description)}</p></div></div>`;
function persist() {
  if (!storageOK && loadMessage) return;
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); storageOK = true; } catch { storageOK = false; }
  $('#storage-warning').hidden = storageOK;
}
function applySettings() {
  document.body.dataset.theme = settings.theme;
  document.body.dataset.color = settings.color;
  $('#theme-button').innerHTML = icon(settings.theme === 'dark' ? 'sun' : 'moon');
  $('#theme-button').setAttribute('aria-label', settings.theme === 'dark' ? 'Helle Ansicht einschalten' : 'Dunkle Ansicht einschalten');
  try { localStorage.setItem('lernorix:settings', JSON.stringify(settings)); } catch { storageOK = false; }
  $('#storage-warning').hidden = storageOK;
}
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
function nav() {
  const items = [['home', 'Übersicht', 'home'], ['learn', 'Lernwissen', 'book'], ['practice', 'Üben', 'pen'], ['exam', 'Prüfung', 'exam'], ...(course.features?.flashcards ? [['cards', 'Lernkarten', 'cards']] : []), ['progress', 'Mein Fortschritt', 'chart']];
  $('#navigation').innerHTML = items.map(([id, label, name]) => `<a href="#${id}" class="${view === id ? 'active' : ''}" ${view === id ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${id === 'learn' ? `<span class="nav-count">${course.topics.length}</span>` : ''}</a>`).join('');
  $('#settings-link').innerHTML = icon('settings') + 'Einstellungen';
  $('#settings-link').classList.toggle('active', view === 'settings');
  if (view === 'settings') $('#settings-link').setAttribute('aria-current', 'page'); else $('#settings-link').removeAttribute('aria-current');
  $('#breadcrumb').textContent = items.find(([id]) => id === view)?.[1] || ({ settings: 'Einstellungen', sources: 'Quellen & Hilfe', session: 'Lerneinheit' })[view] || 'Übersicht';
  $('#topic-pill').textContent = course.title || 'Noch kein Thema';
  $('#topic-pill').title = course.title || 'Noch kein Thema';
}
function empty(title, text) { return `<section class="panel empty-view">${art(true)}<h2>${e(title)}</h2><p>${e(text)}</p><a class="btn" href="#home">Zur Übersicht ${icon('arrow')}</a></section>`; }
function ring(value) { return `<div class="ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="track" cx="40" cy="40" r="33" stroke-width="5" fill="none"/><circle class="fill" cx="40" cy="40" r="33" stroke-width="5" fill="none" stroke-dasharray="${value * 2.073} 207.3"/></svg><strong>${value}<span class="small">%</span></strong></div>`; }
function statsPanel() {
  const stats = topicStats(course, progress);
  return `<section class="panel stats-panel"><h2>Dein Lernstand</h2><div class="progress-summary">${ring(stats.coverage)}<div><div class="summary-number">${stats.answered} <span>/ ${stats.total}</span></div><div class="summary-label">Aufgaben bearbeitet</div></div></div>${course.topics.length ? course.topics.map(t => {
    const s = topicStats(course, progress, t.id);
    return `<div class="progress-topic"><div class="row spread"><a href="${topicLink(t.id)}">${e(t.title)}</a><span>${s.answered} / ${s.total}</span></div><div class="meter" role="progressbar" aria-label="${e(t.title)} – bearbeitet" aria-valuenow="${s.coverage}" aria-valuemin="0" aria-valuemax="100"><span style="width:${s.coverage}%"></span></div></div>`;
  }).join('') : '<div class="progress-empty" aria-label="Noch keine Themen"><div aria-hidden="true"><div class="skeleton-row short"></div><div class="skeleton-row"></div><div class="skeleton-row short"></div><div class="skeleton-row"></div><div class="skeleton-row short"></div><div class="skeleton-row"></div></div><p class="small muted">Sobald Lernziele da sind, siehst du hier deinen Fortschritt pro Thema.</p></div>'}<div class="stats-foot">${icon('lock')} Nur in diesem Browser gespeichert</div></section>`;
}
function renderHome() {
  const hasTopics = course.topics.length > 0;
  const active = progress.session && !progress.session.submitted;
  return heading(course.title || 'Platz für dein nächstes Thema.', course.description || 'Ein Ort für dein Wissen. Und alles, was du noch lernen wirst.', course.subject || 'DEIN PERSÖNLICHER LERNRAUM') + `<div class="dashboard"><div><section class="hero"><div class="hero-copy"><div class="eyebrow">${hasTopics ? 'SCHRITT FÜR SCHRITT' : 'ALLES BEGINNT MIT NEUGIER'}</div><h2>${hasTopics ? 'Dein Thema. Dein Tempo.' : 'Dein nächster Aha-Moment<br>wartet schon.'}</h2><p>${hasTopics ? 'Entdecke deine Lernziele, vertiefe dein Wissen und finde deinen eigenen Lernrhythmus.' : 'Hier bekommt dein nächstes Prüfungsthema<br>seinen eigenen Platz.'}</p>${hasTopics ? `<a class="btn" href="${active ? '#session' : '#learn'}" style="margin-top:17px">${active ? 'Einheit fortsetzen' : 'Lernwissen öffnen'} ${icon('arrow')}</a>` : '<span class="hero-tag"><span class="status-dot"></span> Noch kein Thema hinzugefügt</span>'}</div>${art()}</section><div class="section-heading"><h2>Lernziele</h2><span>${course.topics.filter(t => progress.read[t.id]).length} / ${course.topics.length} gelesen</span></div>${hasTopics ? `<div class="grid">${course.topics.map((t, i) => `<a class="panel goal-card" href="${topicLink(t.id)}"><div class="row spread"><span class="eyebrow">LERNZIEL ${String(i + 1).padStart(2, '0')}</span>${icon('book')}</div>${t.blocks.find(b => b.type === 'image') ? `<img class="goal-image" src="${e(safeURL(t.blocks.find(b => b.type === 'image').src, true))}" alt="" loading="lazy">` : ''}<h3>${e(t.title)}</h3>${t.summary ? `<p>${e(t.summary)}</p>` : ''}<div class="card-bottom row spread"><span>${progress.read[t.id] ? 'Gelesen · weiter vertiefen' : 'Lernwissen entdecken'}</span>${icon('arrow')}</div></a>`).join('')}</div>` : `<section class="empty-goals">${art(true)}<h3>Hier wachsen deine Lernziele.</h3><p>Wenn dein Thema hinzukommt, findest du hier alle<br>Lernziele und das passende Wissen dazu.</p></section>`}<div class="feature-strip">${[['learn', 'book', 'Wissen entdecken', 'Verstehen statt auswendig lernen'], ['practice', 'pen', 'In Ruhe üben', 'Aufgaben in deinem Tempo'], ['exam', 'exam', 'Dich selbst testen', 'Digital oder auf Papier']].map(([url, ic, title, desc]) => `<a class="feature-link" href="#${url}"><span class="feature-icon">${icon(ic)}</span><span><strong>${title}</strong><small>${desc}</small></span></a>`).join('')}</div></div><aside>${statsPanel()}</aside></div>`;
}
function renderQuestionMedia(q, interactive = false) { return q.type === 'hotspot' ? renderHotspots(q, interactive) : renderMedia(q.media, true); }
function renderMedia(media, eager = false) {
  if (!media) return '';
  if (Array.isArray(media)) return `<div class="media-gallery">${media.map(item => renderMedia(item, eager)).join('')}</div>`;
  const src = e(safeURL(media.src, true));
  return `<figure class="learning-media"><a href="${src}" target="_blank" rel="noopener noreferrer" aria-label="Bild vergrössern: ${e(media.alt)}"><img src="${src}" alt="${e(media.alt)}" loading="${eager ? 'eager' : 'lazy'}"></a>${media.caption ? `<figcaption>${e(media.caption)}</figcaption>` : ''}<span class="media-hint">Bild anklicken zum Vergrössern ↗</span></figure>`;
}
function renderBlock(block) {
  switch (block.type) {
    case 'text': return `${block.title ? `<h2>${e(block.title)}</h2>` : ''}<p>${e(block.text).replace(/\n/g, '<br>')}</p>`;
    case 'callout': return `<aside class="notice">${block.title ? `<strong>${e(block.title)}</strong><br>` : ''}${e(block.text)}</aside>`;
    case 'image': return renderMedia(block);
    case 'steps': return `${block.title ? `<h2>${e(block.title)}</h2>` : ''}<ol class="steps">${block.items.map(item => `<li>${e(item)}</li>`).join('')}</ol>`;
    case 'check': return `<details><summary>${e(block.prompt)}</summary><p>${e(block.answer)}</p></details>`;
    default: return '';
  }
}
function renderLearn() {
  if (!course.topics.length) return heading('Lernwissen', 'Verstehen, verknüpfen, weiterdenken.') + empty('Wissen braucht ein Thema.', 'Hier entstehen deine Lernseiten mit Erklärungen, Bildern, Grafiken, kleinen Selbstchecks und passenden Quellen.');
  const t = course.topics.find(x => x.id === topicId) || course.topics[0]; topicId = t.id;
  return heading(t.title, t.summary || '', course.title || 'Lernwissen') + `<div class="lesson-layout"><aside class="panel topic-list"><div class="eyebrow">Lernziele</div>${course.topics.map(x => `<a class="${x.id === t.id ? 'active' : ''}" ${x.id === t.id ? 'aria-current="page"' : ''} href="${topicLink(x.id)}">${e(x.title)}</a>`).join('')}</aside><div class="stack"><article class="panel prose">${t.blocks.length ? t.blocks.map(renderBlock).join('') : '<p class="muted">Zu diesem Lernziel sind noch keine Inhalte hinterlegt.</p>'}<div class="lesson-bottom row spread"><label class="check-label"><input type="checkbox" id="read-topic" ${progress.read[t.id] ? 'checked' : ''}> Als gelesen markieren</label><a class="btn" href="#practice/${encodeURIComponent(t.id)}">Dieses Lernziel üben ${icon('arrow')}</a></div></article>${t.sources.length ? `<section class="panel"><h2>Weiter entdecken</h2>${sourcesList(t.sources)}</section>` : ''}<section class="panel notes"><label for="topic-notes">Meine Notizen</label><textarea id="topic-notes" maxlength="20000" placeholder="Was möchtest du dir merken?">${e(progress.notes[t.id] || '')}</textarea><p class="small muted">${storageOK ? 'Wird automatisch in diesem Browser gespeichert.' : 'Speichern ist eingeschränkt. Sichere deinen Stand unter Einstellungen.'}</p></section></div></div>`;
}
function sourcesList(sources) { return `<ul class="sources-list">${sources.map(s => `<li><a href="${e(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">${e(s.title)} ↗</a>${s.note ? `<div class="small muted">${e(s.note)}</div>` : ''}</li>`).join('')}</ul>`; }
function renderConfig(mode) {
  const exam = mode === 'exam';
  const active = progress.session && !progress.session.submitted;
  return heading(exam ? 'Deine Generalprobe.' : 'Übung macht den Unterschied.', exam ? 'Stelle deinen Test zusammen. Löse ihn hier oder nimm ihn mit aufs Papier.' : 'Wähle deine Lernziele und übe in deinem Tempo. Mit Feedback nach jeder Aufgabe.', exam ? 'PRÜFUNG' : 'ÜBEN') + `${active ? `<div class="notice row spread"><span>Du hast eine laufende ${progress.session.mode === 'exam' ? 'Prüfung' : 'Übung'}.</span><a class="btn" href="#session">Fortsetzen ${icon('arrow')}</a></div>` : ''}<div class="config-layout"><form class="panel" id="session-config" data-mode="${mode}"><fieldset><legend>Lernziele</legend>${course.topics.length ? `<div class="topic-checks">${course.topics.map(t => `<label class="check-label"><input type="checkbox" name="topic" value="${e(t.id)}" ${!location.hash.split('/')[1] || t.id === topicId ? 'checked' : ''}>${e(t.title)}</label>`).join('')}</div>` : '<p class="small muted">Noch keine Lernziele vorhanden. Mit deinem Thema erscheinen hier die auswählbaren Lernziele.</p>'}</fieldset><div class="form-grid"><div class="field"><label for="difficulty">Schwierigkeit</label><select id="difficulty" name="level"><option value="all">Gemischt</option>${Object.entries(LEVELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div><div class="field"><label for="question-count">Aufgaben</label><select id="question-count" name="count">${[1, 5, 10, 12, 15, 20, 30].map(n => `<option value="${n}" ${n === 10 ? 'selected' : ''}>${n} Aufgaben</option>`).join('')}</select></div><div class="field"><label for="${exam ? 'minutes' : 'question-type'}">${exam ? 'Zeitlimit' : 'Format'}</label>${exam ? '<select id="minutes" name="minutes"><option value="0">Ohne Zeitlimit</option><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option></select>' : `<select id="question-type" name="type"><option value="all">Alle Formate</option>${Object.entries(TYPES).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>`}</div></div>${!exam ? `<label class="check-label" style="margin-top:20px"><input type="checkbox" name="weak-only"> Schwachstellen üben – nur zuletzt falsch oder teilweise gelöste Aufgaben</label>` : ''}<div class="form-footer"><p class="small muted" id="available-count" aria-live="polite"></p><div class="row"><button class="btn primary" type="submit" id="start-session" ${!course.questions.length ? 'disabled' : ''}>${icon(exam ? 'exam' : 'pen')}${exam ? 'Test erstellen' : 'Übung starten'}</button>${exam ? '<span class="small muted">Danach digital starten oder ausdrucken.</span>' : ''}</div></div></form><aside class="panel aside-note">${icon(exam ? 'print' : 'book')}<h3>${exam ? 'Dein Test. Deine Wahl.' : 'Raum zum Ausprobieren.'}</h3><p>${exam ? 'Du kannst jeden erstellten Test direkt ausdrucken oder über den Druckdialog als PDF speichern.' : 'Falsche Antworten gehören dazu. Du bekommst nach jeder Aufgabe eine Erklärung und kannst gezielt weiterlesen.'}</p><p>${exam ? 'Auf Wunsch mit einem separaten Lösungsblatt. Die gedruckte Version enthält dieselben Aufgaben wie der digitale Test.' : 'Dein Fortschritt wird pro Lernziel gespeichert. Freie Antworten schätzt du mithilfe von Kriterien selbst ein.'}</p></aside></div>${!exam ? `<section class="panel format-section"><div class="eyebrow">ABWECHSLUNG ENTDECKEN</div><h2>${Object.keys(TYPES).length} Wege zum Aha-Moment</h2><p>Gemischte Runden wechseln zwischen Formaten. Oder probiere gezielt eines aus.</p><div class="format-catalog">${Object.entries(TYPES).map(([type,label],i) => `<button type="button" data-action="set-format" data-value="${type}"><span>${String(i+1).padStart(2,'0')}</span><strong>${e(label)}</strong></button>`).join('')}</div></section>` : ''}`;
}
function optionsFromForm() {
  const form = $('#session-config');
  const data = new FormData(form);
  return { mode: form.dataset.mode, topicIds: data.getAll('topic'), level: data.get('level'), count: Number(data.get('count')), type: data.get('type') || 'all', weakOnly: form.dataset.mode === 'practice' && data.has('weak-only'), attempts: progress.attempts, minutes: Number(data.get('minutes') || 0) };
}
function updateAvailable() {
  if (!$('#session-config')) return;
  const options = optionsFromForm();
  const n = filterQuestions(course.questions, options).length;
  $('#available-count').textContent = n ? `${n} passende Aufgaben · Deine Runde enthält ${Math.min(options.count, n)} Aufgaben.` : options.weakOnly ? 'Keine Schwachstellen für diese Auswahl gespeichert. Löse zuerst Aufgaben oder schalte den Filter aus.' : 'Noch keine passenden Aufgaben. Wähle andere Filter oder ergänze zuerst Lerninhalte.';
  $('#start-session').disabled = n === 0;
}
function answerLabel(q, answer) { if (isActivity(q)) return activityAnswerLabel(q, answer); return answer === undefined || answer === '' ? 'Keine Antwort' : q.type === 'choice' ? q.options[Number(answer)] || 'Keine Antwort' : String(answer); }
function solution(q) {
  if (isActivity(q)) return e(activitySolution(q)).replace(/\n/g, '<br>');
  return q.type === 'choice' ? e(q.options[q.answer]) : q.type === 'text' ? q.answers.map(e).join(' / ') : `${e(q.sample)}<ul>${q.criteria.map(c => `<li>${e(c)}</li>`).join('')}</ul>`;
}
function questionInput(q, session) {
  const answer = session.answers[q.id];
  const locked = Object.hasOwn(session.results, q.id);
  if (isActivity(q)) return renderActivity({ ...q, selectedItem: categorySelection.questionId === q.id ? categorySelection.index : null }, answer, locked);
  if (q.type === 'choice') return `<fieldset class="options"><legend class="small muted">Wähle eine Antwort.</legend>${q.optionOrder.map(i => `<label class="option"><input type="radio" name="answer" value="${i}" ${String(answer) === String(i) ? 'checked' : ''} ${locked ? 'disabled' : ''}>${e(q.options[i])}</label>`).join('')}</fieldset>`;
  return `<div class="field"><label for="answer-text">Deine Antwort</label><textarea id="answer-text" name="answer" maxlength="20000" ${locked ? 'disabled' : ''} placeholder="Schreibe deine Antwort …">${e(answer || '')}</textarea></div>`;
}
function feedback(q, score, showSelf = false) {
  return `<div class="feedback"><h3>${score === undefined || score === null ? 'Vergleiche mit der Musterlösung' : score === 1 ? 'Richtig gelöst' : score === 0.5 ? 'Teilweise gelöst' : 'Noch einmal anschauen'}</h3><p>${solution(q)}</p>${q.explanation ? `<p>${e(q.explanation)}</p>` : ''}${showSelf ? `<p class="small muted">Wie gut erfüllt deine Antwort die Kriterien? Diese Bewertung ist eine Selbsteinschätzung.</p><div class="row">${btn('Noch nicht', 'self-grade', '0')}${btn('Teilweise', 'self-grade', '0.5')}${btn('Erfüllt', 'self-grade', '1')}</div>` : ''}</div>`;
}
function renderSession() {
  const s = progress.session;
  if (!s) return heading('Deine Lerneinheit', '') + empty('Noch keine Runde gestartet.', 'Wähle unter Üben oder Prüfung deine Lernziele und die passende Schwierigkeit.');
  if (s.submitted) return renderResults(s);
  if (s.mode === 'exam' && s.started !== true && !s.deadline && !Object.keys(s.answers).length && s.preview === true) return renderExamPreview(s);
  const q = s.questions[s.index];
  const checked = Object.hasOwn(s.results, q.id);
  return heading(s.mode === 'exam' ? 'Konzentriert. Schritt für Schritt.' : 'Eine Frage weiter.', course.title || '', s.mode === 'exam' ? 'PRÜFUNG' : 'ÜBUNG') + `<div class="question-panel"><div class="row spread" style="margin-bottom:17px"><span class="small muted">Aufgabe ${s.index + 1} von ${s.questions.length}</span><span class="badge" id="timer">${s.deadline ? 'Zeit läuft' : 'Ohne Zeitlimit'}</span></div><div class="question-dots" aria-label="Aufgaben wählen">${s.questions.map((x, i) => `<button data-action="question" data-value="${i}" class="${s.index === i ? 'current' : ''} ${Object.hasOwn(s.answers, x.id) && hasAnswer(x, s.answers[x.id]) ? 'answered' : ''}" aria-label="Aufgabe ${i + 1}${hasAnswer(x, s.answers[x.id]) ? ', beantwortet' : ''}" ${s.index === i ? 'aria-current="step"' : ''}>${i + 1}</button>`).join('')}</div><section class="panel"><div class="row spread"><span class="badge accent">${e(topicTitle(q.topicId))}</span><span class="badge">${LEVELS[q.level]} · ${TYPES[q.type]}</span></div><h2>${e(q.prompt)}</h2>${renderQuestionMedia(q, true)}${questionInput(q, s)}${checked ? feedback(q, s.results[q.id]) : `<div id="question-feedback"></div>`}<div class="question-nav"><div class="row">${s.index ? btn('Zurück', 'question', s.index - 1) : ''}${s.index < s.questions.length - 1 ? btn('Weiter ' + icon('arrow'), 'question', s.index + 1) : ''}</div>${s.mode === 'practice' && !checked ? btn('Antwort prüfen', 'check-answer', '', 'primary') : ''}</div></section><div class="row spread" style="margin-top:22px"><a href="${s.mode === 'exam' ? '#exam' : '#practice'}" class="small">Später fortsetzen</a>${btn(s.mode === 'exam' ? 'Test abgeben' : 'Runde beenden', 'finish', '', 'primary')}</div></div>`;
}
function renderExamPreview(s) {
  return heading('Dein Test ist zusammengestellt.', `${s.questions.length} Aufgaben · ${LEVELS[s.level] || 'Gemischte Schwierigkeit'}`, 'PRÜFUNG') + `<section class="panel"><div class="row spread"><div><h2>${e(course.title || 'Übungstest')}</h2><span class="version-label">Version ${e(s.id)}</span></div><span class="badge">${s.plannedMinutes ? s.plannedMinutes + ' Minuten' : 'Ohne Zeitlimit'}</span></div><div class="notice">Die Lösungen bleiben bis zur Abgabe verborgen. Beim digitalen Start beginnt ein gewähltes Zeitlimit.</div><div class="row">${btn('Digital starten ' + icon('arrow'), 'begin-exam', '', 'primary')}${btn(icon('print') + ' Test drucken', 'print')}<label class="check-label"><input id="include-solutions" type="checkbox"> Separates Lösungsblatt</label></div><div class="exam-preview">${s.questions.map((q, i) => `<div class="print-question"><div class="small muted">${i + 1} · ${e(topicTitle(q.topicId))} · ${LEVELS[q.level]}</div><h3>${e(q.prompt)}</h3>${renderQuestionMedia(q)}${isActivity(q) ? activityPrint(q) : ''}</div>`).join('')}</div></section>`;
}
function renderResults(s) {
  const graded = s.questions.filter(q => Object.hasOwn(s.results, q.id));
  const score = graded.reduce((sum, q) => sum + s.results[q.id], 0);
  const pending = s.questions.filter(q => q.type === 'open' && !Object.hasOwn(s.results, q.id));
  return heading('Ein Blick auf deinen Lernstand.', 'Nutze deine Auswertung, um gezielt weiterzulernen.', 'AUSWERTUNG') + `<section class="panel"><div class="row spread"><div><div class="score-number">${score.toLocaleString('de-CH')} <span class="muted" style="font-size:24px">/ ${s.questions.length}</span></div><p class="small muted">Punkte · ${graded.length} von ${s.questions.length} Aufgaben bewertet${pending.length ? ' · Ergebnis noch unvollständig' : ''}</p></div><div class="row">${btn(icon('print') + ' Test drucken', 'print')}<label class="check-label"><input id="include-solutions" type="checkbox"> Mit Lösungsblatt</label><a class="btn primary" href="#${s.mode}">Neue Runde</a></div></div>${pending.length ? `<div class="notice">${pending.length} freie Antworten benötigen noch deine Selbsteinschätzung. Öffne die jeweilige Aufgabe und vergleiche sie mit den Kriterien.</div>` : ''}${s.questions.map((q, i) => `<details class="result-row" ${pending.includes(q) ? 'open' : ''}><summary>${i + 1}. ${e(q.prompt)} <span class="badge">${Object.hasOwn(s.results, q.id) ? `${s.results[q.id]} / 1` : 'Noch nicht bewertet'}</span></summary>${renderQuestionMedia(q)}<p style="margin-top:16px"><strong>Deine Antwort:</strong> ${e(answerLabel(q, s.answers[q.id]))}</p>${feedback(q, s.results[q.id])}${pending.includes(q) ? `<p class="small muted">Bewerte anhand der Kriterien, wie gut deine Antwort passt.</p><div class="row">${[0, 0.5, 1].map(n => btn(n === 0 ? 'Noch nicht' : n === 0.5 ? 'Teilweise' : 'Erfüllt', 'result-grade', `${q.id}|${n}`)).join('')}</div>` : ''}<p style="margin-top:17px"><a href="${topicLink(q.topicId)}">${e(topicTitle(q.topicId))} nachlesen →</a></p></details>`).join('')}</section>`;
}
function renderProgress() {
  const stats = topicStats(course, progress);
  return heading('Jeder Schritt zählt.', 'Dein Überblick über gelesene Lernziele und bearbeitete Aufgaben.', 'MEIN FORTSCHRITT') + `<div class="metric-grid"><section class="panel"><strong>${stats.answered}</strong><span>Aufgaben bearbeitet</span></section><section class="panel"><strong>${stats.answered ? stats.accuracy + '%' : '—'}</strong><span>Letzte Ergebnisse</span></section><section class="panel"><strong>${course.topics.filter(t => progress.read[t.id]).length}</strong><span>Lernziele gelesen</span></section></div>${course.topics.length ? `<section class="panel"><h2>Deine Lernziele im Detail</h2>${course.topics.map(t => { const s = topicStats(course, progress, t.id); return `<div class="progress-topic"><div class="row spread"><a href="${topicLink(t.id)}">${e(t.title)}</a><span>${s.answered} / ${s.total} bearbeitet · ${s.answered ? s.accuracy + '% erreicht' : 'noch offen'}</span></div><div class="meter"><span style="width:${s.coverage}%"></span></div></div>`; }).join('')}<p class="small muted" style="margin-top:25px">Die Balken zeigen die bearbeiteten Aufgaben. Ergebnisse zählen jeweils die letzte Bewertung; freie Antworten enthalten deine Selbsteinschätzung.</p></section>` : empty('Dein Fortschritt beginnt hier.', 'Sobald du Aufgaben löst oder Lernziele liest, füllt sich diese Übersicht.')} ${progress.exams.length ? `<section class="panel" style="margin-top:24px"><h2>Abgeschlossene Prüfungen</h2>${progress.exams.slice().reverse().map(x => `<div class="row spread result-row"><span>${new Date(x.at).toLocaleDateString('de-CH')}</span><strong>${x.score.toLocaleString('de-CH')} / ${x.total} Punkte</strong></div>`).join('')}</section>` : ''}`;
}
function renderSettings() {
  return heading('Mach es zu deinem Lernraum.', 'Eine Farbe, die zu dir passt. Ein Lernstand, der bei dir bleibt.', 'EINSTELLUNGEN') + `<div class="settings-grid"><section class="panel"><h2>Deine Akzentfarbe</h2><p>Wähle deinen Lieblingsfarbton.</p><div class="swatches">${[['orange', 'Orange', '#ae491c'], ['blue', 'Blau', '#2854ad'], ['green', 'Grün', '#246e58'], ['violet', 'Violett', '#7451a6']].map(([value, label, color]) => `<button class="swatch" style="background:${color}" aria-label="${label}" title="${label}" aria-pressed="${settings.color === value}" data-action="color" data-value="${value}">${settings.color === value ? icon('check') : ''}</button>`).join('')}</div></section><section class="panel"><h2>Hell oder dunkel?</h2><p>So, wie es für deine Augen angenehm ist.</p><div class="segmented">${btn(icon('sun') + ' Hell', 'theme', 'light', settings.theme === 'light' ? 'selected' : '')}${btn(icon('moon') + ' Dunkel', 'theme', 'dark', settings.theme === 'dark' ? 'selected' : '')}</div></section><section class="panel"><h2>Deinen Fortschritt sichern</h2><p>Fortschritt und Notizen bleiben in diesem Browser. Mit einer Sicherung kannst du sie auf ein anderes Gerät mit demselben Thema übertragen.</p><div class="row" style="margin-top:20px">${btn(icon('download') + ' Sicherung laden', 'export')}<label class="btn upload-label" for="import-file">Sicherung einlesen</label><input id="import-file" type="file" accept="application/json,.json" hidden></div><p class="small muted" style="margin-top:14px">Gilt für dieses Thema. Es gibt keine automatische Synchronisierung.</p></section><section class="panel"><h2>Neu anfangen</h2><p>Setzt Fortschritt, Notizen und die laufende Einheit für dieses Thema zurück. Deine Farbeinstellungen bleiben erhalten.</p>${btn('Fortschritt zurücksetzen', 'reset', '', 'danger')}<div id="reset-confirm" hidden><p style="margin-top:18px">Diesen Lernstand wirklich löschen? Sichere ihn vorher, wenn du ihn behalten möchtest.</p><div class="row">${btn('Ja, zurücksetzen', 'confirm-reset', '', 'danger')}${btn('Abbrechen', 'cancel-reset')}</div></div></section></div>`;
}
function renderSources() {
  return heading('Weiterlesen. Nachschlagen.', 'Quellen zu deinem Thema und ein paar Hinweise zu deinem Lernraum.', 'QUELLEN & HILFE') + `<div class="stack">${course.topics.some(t => t.sources.length) ? course.topics.filter(t => t.sources.length).map(t => `<section class="panel"><h2>${e(t.title)}</h2>${sourcesList(t.sources)}</section>`).join('') : '<section class="panel"><h2>Noch keine Quellen hinterlegt</h2><p class="muted">Mit deinen Lerninhalten kommen hier die verwendeten Quellen und passende Links hinzu.</p></section>'}<section class="panel prose"><h2>Dein Lernraum, ohne Anmeldung</h2><p>Lernorix speichert deinen Fortschritt, deine Notizen und deine Einstellungen lokal in diesem Browser. Wenn du Browserdaten löschst oder das Gerät wechselst, brauchst du eine Sicherung aus den Einstellungen.</p><h2>Wie wird bewertet?</h2><p>Auswahlfragen werden automatisch ausgewertet. Kurzantworten werden mit hinterlegten Antworten verglichen; Grossschreibung und zusätzliche Leerzeichen spielen keine Rolle. Freie Antworten bewertest du anhand einer Musterlösung und Kriterien selbst. Das ist keine automatische Benotung.</p><h2>Auf Papier lernen</h2><p>Erstelle unter Prüfung einen Test und wähle «Test drucken». Im Druckdialog kannst du einen Drucker auswählen oder die Datei als PDF speichern. Ein optionales Lösungsblatt beginnt auf einer neuen Seite.</p><h2>Ein neues Prüfungsthema</h2><p>Gib deine Unterlagen und Lernziele beim nächsten Mal an ChatGPT weiter. Daraus können Lernseiten, passende Aufgaben, Quellen und bei Bedarf Lernkarten für diesen Lernraum entstehen.</p></section></div>`;
}
function renderCards() {
  if (!course.features?.flashcards || !course.flashcards.length) return heading('Lernkarten', '') + empty('Für dieses Thema nicht eingerichtet.', 'Lernkarten können ergänzt werden, wenn sie zu deinen Lernzielen passen.');
  cardIndex %= course.flashcards.length;
  const card = course.flashcards[cardIndex];
  return heading('Ein Gedanke. Eine Karte.', topicTitle(card.topicId), 'LERNKARTEN') + `<section class="panel flashcard"><span class="badge">${cardIndex + 1} / ${course.flashcards.length}</span><h2 style="margin-top:25px">${e(cardFlipped ? card.back : card.front)}</h2>${btn(cardFlipped ? 'Frage anzeigen' : 'Antwort aufdecken', 'flip-card', '', 'primary')}</section><div class="row spread" style="margin-top:22px">${btn('Vorherige', 'card', '-1')}${btn('Nächste ' + icon('arrow'), 'card', '1')}</div>`;
}
function render(focus = false) {
  nav();
  const views = { home: renderHome, learn: renderLearn, practice: () => renderConfig('practice'), exam: () => renderConfig('exam'), session: renderSession, progress: renderProgress, settings: renderSettings, sources: renderSources, cards: renderCards };
  $('#main').innerHTML = (views[view] || renderHome)();
  document.title = `${$('#breadcrumb').textContent} · ${course.title ? course.title + ' · ' : ''}Lernorix`;
  updateAvailable();
  if (focus) { $('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  tick();
}
const mobileViewport = window.matchMedia('(max-width: 720px)');
function closeMenu() { $('#sidebar').classList.remove('open'); $('#sidebar').inert = mobileViewport.matches; $('#scrim').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); }
function route() {
  const [next, id] = location.hash.slice(1).split('/');
  view = ['home', 'learn', 'practice', 'exam', 'session', 'progress', 'settings', 'sources', 'cards'].includes(next) ? next : 'home';
  if (id) { try { topicId = decodeURIComponent(id); } catch { topicId = course.topics[0]?.id; } }
  closeMenu(); render(true);
}
function saveAnswer() {
  const s = progress.session; if (view !== 'session' || !s || s.submitted) return;
  const q = s.questions[s.index];
  if (Object.hasOwn(s.results, q.id)) return;
  if (isActivity(q)) { const root = $('[data-activity-root]'); if (!root) return; s.answers[q.id] = readActivity(q, root); persist(); return; }
  const control = q.type === 'choice' ? $('input[name=answer]:checked') : $('#answer-text');
  if (control) { s.answers[q.id] = control.value; persist(); }
}
function addResult(q, score) {
  const s = progress.session;
  if (Object.hasOwn(s.results, q.id)) return;
  s.results[q.id] = score; recordResult(progress, q, s.answers[q.id], score);
}
function updateExamHistory() {
  const s = progress.session;
  if (s.mode !== 'exam' || !s.submitted || s.questions.some(q => !Object.hasOwn(s.results, q.id))) return;
  const result = { id: s.id, at: Date.now(), total: s.questions.length, score: Object.values(s.results).reduce((a, b) => a + b, 0) };
  progress.exams = [...progress.exams.filter(x => x.id !== s.id), result].slice(-50);
}
function finish(timedOut = false) {
  const s = progress.session; if (!s || s.submitted) return;
  saveAnswer();
  const missing = s.questions.filter(q => !hasAnswer(q, s.answers[q.id])).length;
  if (!timedOut && missing && !window.confirm(`${missing} Aufgaben sind noch unbeantwortet. Trotzdem beenden?`)) return;
  for (const q of s.questions) {
    if (Object.hasOwn(s.results, q.id)) continue;
    if (!hasAnswer(q, s.answers[q.id])) addResult(q, 0);
    else if (q.type !== 'open') addResult(q, grade(q, s.answers[q.id]));
  }
  s.submitted = true; updateExamHistory(); persist(); render(true);
  if (timedOut) toast('Die Zeit ist abgelaufen. Dein Test wurde abgegeben.');
}
function tick() {
  const s = progress.session;
  if (!s || s.submitted || !s.deadline) return;
  const seconds = Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000));
  if (!seconds) { finish(true); return; }
  if ($('#timer')) $('#timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} verbleibend`;
}
async function printTest() {
  const s = progress.session; if (!s) return;
  const solutions = $('#include-solutions')?.checked;
  $('#print-area').innerHTML = `<div class="print-header"><p>LERNORIX · PRÜFUNG</p><h1>${e(course.title || 'Übungstest')}</h1><p>${s.questions.length} Aufgaben · ${LEVELS[s.level] || 'Gemischt'} · ${s.plannedMinutes ? s.plannedMinutes + ' Minuten' : s.deadline ? Math.round((s.deadline - s.createdAt) / 60000) + ' Minuten' : 'Ohne Zeitlimit'}</p><p class="version-label">Version ${e(s.id)} · ${new Date(s.createdAt).toLocaleDateString('de-CH')}</p><div class="print-meta"><span>Name:</span><span>Datum:</span><span>Punkte: ____ / ${s.questions.length}</span></div></div>${s.questions.map((q, i) => `<section class="print-question"><p class="small">${e(topicTitle(q.topicId))} · ${LEVELS[q.level]} · 1 Punkt</p><h3>${i + 1}. ${e(q.prompt)}</h3>${renderQuestionMedia(q)}${isActivity(q) ? activityPrint(q) : q.type === 'choice' ? q.optionOrder.map(n => `<div class="print-option">☐ ${e(q.options[n])}</div>`).join('') : '<div class="answer-lines"></div>'}</section>`).join('')}${solutions ? `<section class="print-solution"><h1>Lösungsblatt</h1><p class="version-label">${e(course.title)} · Version ${e(s.id)}</p>${s.questions.map((q, i) => `<section class="print-question"><h3>${i + 1}. ${e(q.prompt)}</h3><div>${solution(q)}</div>${q.type === 'open' ? '<p>Selbsteinschätzung anhand der Kriterien: 0 / 0,5 / 1 Punkt.</p>' : ''}${q.explanation ? `<p>${e(q.explanation)}</p>` : ''}</section>`).join('')}</section>` : ''}`;
  try { await Promise.all([...$('#print-area').querySelectorAll('img')].map(img => img.decode())); }
  catch { toast('Ein Testbild konnte nicht geladen werden. Bitte prüfe die Bilder und drucke erneut.'); return; }
  window.print();
}
function exportProgress() {
  const blob = new Blob([JSON.stringify({ format: 'lernorix-backup', version: 1, courseId: course.id, revision: course.revision, exportedAt: new Date().toISOString(), progress }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `lernorix-${course.id}-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); toast('Deine Sicherung wurde zum Download bereitgestellt.');
}
async function importProgress(file) {
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Diese Datei ist zu gross.');
    const backup = JSON.parse(await file.text());
    if (backup.format !== 'lernorix-backup' || backup.version !== 1 || backup.courseId !== course.id || backup.revision !== course.revision) throw new Error('Diese Sicherung gehört zu einem anderen Thema oder einer anderen Inhaltsversion.');
    const clean = validateProgress(backup.progress, course);
    if (!window.confirm('Die Sicherung ersetzt Fortschritt und Notizen dieses Themas. Fortfahren?')) return;
    progress = clean; loadMessage = ''; persist(); render(); toast(storageOK ? 'Dein Lernstand wurde wiederhergestellt.' : 'Lernstand geladen. Lokales Speichern ist weiterhin nicht möglich.');
  } catch (error) { toast(`Sicherung nicht eingelesen: ${error.message}`); }
}

document.addEventListener('submit', event => {
  if (event.target.id !== 'session-config') return;
  event.preventDefault();
  if (progress.session && !progress.session.submitted && !window.confirm('Die neue Runde ersetzt deine laufende Einheit. Bereits bewertete Aufgaben bleiben erhalten. Fortfahren?')) return;
  const options = optionsFromForm();
  const session = createSession(course, { ...options, minutes: 0 });
  if (!session) { toast('Keine passenden Aufgaben vorhanden.'); return; }
  if (options.mode === 'exam') { session.preview = true; session.started = false; session.plannedMinutes = options.minutes; }
  progress.session = session; persist(); location.hash = 'session';
});
document.addEventListener('input', event => {
  if (event.target.name === 'answer') saveAnswer();
  if (event.target.closest('[data-activity-root]')) {
    if (event.target.dataset.year) { event.target.dataset.touched = 'true'; const output = document.querySelector('[data-year-output="' + event.target.dataset.part + '"]'); if (output) output.textContent = event.target.value; }
    saveAnswer();
  }
  if (event.target.id === 'topic-notes') { progress.notes[topicId] = event.target.value; persist(); }
});
document.addEventListener('change', event => {
  if (event.target.closest('#session-config')) updateAvailable();
  if (event.target.closest('[data-activity-root]')) saveAnswer();
  if (event.target.id === 'read-topic') { progress.read[topicId] = event.target.checked; persist(); }
  if (event.target.id === 'import-file') importProgress(event.target.files[0]);
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action, value = button.dataset.value;
  const s = progress.session;
  if (action === 'set-format') { $('#question-type').value = value; updateAvailable(); $('#question-type').focus(); $('#session-config').scrollIntoView({behavior:'smooth',block:'start'}); }
  else if (action === 'color') { settings.color = value; applySettings(); render(); }
  else if (action === 'theme') { settings.theme = value; applySettings(); render(); }
  else if (action === 'question' && s) { saveAnswer(); s.index = Math.max(0, Math.min(s.questions.length - 1, Number(value))); persist(); render(true); }
  else if (action === 'check-answer' && s) {
    saveAnswer(); const q = s.questions[s.index];
    if (!hasAnswer(q, s.answers[q.id])) { toast('Gib zuerst eine Antwort ein.'); return; }
    if (q.type === 'open') { $('#question-feedback').innerHTML = feedback(q, null, true); button.disabled = true; }
    else { addResult(q, grade(q, s.answers[q.id])); persist(); render(); }
  }
  else if (action === 'self-grade' && s) { saveAnswer(); addResult(s.questions[s.index], Number(value)); persist(); render(); }
  else if (action === 'result-grade' && s) { const [id, score] = value.split('|'); const q = s.questions.find(x => x.id === id); if (q) { addResult(q, Number(score)); updateExamHistory(); persist(); render(); } }
  else if (action === 'finish') finish();
  else if (action === 'begin-exam' && s) { s.started = true; s.preview = false; s.createdAt = Date.now(); s.deadline = s.plannedMinutes ? Date.now() + s.plannedMinutes * 60000 : null; persist(); render(true); }
  else if (action === 'print') printTest();
  else if (action === 'export') exportProgress();
  else if (action === 'reset') $('#reset-confirm').hidden = false;
  else if (action === 'cancel-reset') $('#reset-confirm').hidden = true;
  else if (action === 'confirm-reset') { progress = newProgress(); loadMessage = ''; persist(); render(); toast('Dein Fortschritt wurde zurückgesetzt.'); }
  else if (action === 'flip-card') { cardFlipped = !cardFlipped; render(); }
  else if (action === 'card') { cardIndex = (cardIndex + Number(value) + course.flashcards.length) % course.flashcards.length; cardFlipped = false; render(); }
});
$('#theme-button').addEventListener('click', () => { settings.theme = settings.theme === 'light' ? 'dark' : 'light'; applySettings(); if (view === 'settings') render(); });
$('#menu-button').addEventListener('click', () => { const open = !$('#sidebar').classList.contains('open'); $('#sidebar').classList.toggle('open', open); $('#sidebar').inert = !open; $('#scrim').hidden = !open; $('#menu-button').setAttribute('aria-expanded', String(open)); if (open) $('#navigation a').focus(); });
mobileViewport.addEventListener('change', closeMenu);
$('#scrim').addEventListener('click', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#sidebar').classList.contains('open')) { closeMenu(); $('#menu-button').focus(); } });
window.addEventListener('hashchange', route);
window.addEventListener('afterprint', () => { $('#print-area').innerHTML = ''; });
window.addEventListener('beforeunload', saveAnswer);
setInterval(tick, 1000);
applySettings();
if (loadMessage) { $('#storage-warning').textContent = loadMessage; $('#storage-warning').hidden = false; }
route();

// Specialized activity controls keep all changes inside the current authored question.
document.addEventListener('click', event => {
 const button = event.target.closest('[data-activity-action]'); if (!button || button.disabled) return;
 const s = progress.session; if (view !== 'session' || !s || s.submitted) return;
 const q = s.questions[s.index]; if (Object.hasOwn(s.results, q.id)) return;
 const action = button.dataset.activityAction;
 if (action === 'accept-year' && q.type === 'date') { const slider = document.querySelector('[data-activity-root] [data-part="' + button.dataset.item + '"]'); if (!slider) return; slider.dataset.touched = 'true'; const output = document.querySelector('[data-year-output="' + button.dataset.item + '"]'); if (output) output.textContent = slider.value; saveAnswer(); button.textContent = 'Jahr übernommen'; return; }
 if (action === 'spot') { document.querySelector('[data-activity-root] [data-part="' + button.dataset.item + '"]')?.focus(); return; }
 const result = activityAction(q, s.answers[q.id], action, button.dataset.item, categorySelection.questionId === q.id ? categorySelection.index : null);
 if (!result) { if(action==='place') toast('Wähle zuerst einen Begriff.'); return; }
 if ('answer' in result) s.answers[q.id] = result.answer;
 if ('selectedItem' in result) categorySelection = {questionId:q.id,index:result.selectedItem};
 persist(); render();
 const selector = '[data-activity-action="' + action + '"][data-item="' + button.dataset.item + '"]';
 const target = document.querySelector(selector);
 if (target && !target.disabled) target.focus(); else document.querySelector('[data-activity-action]:not(:disabled)')?.focus();
});
document.addEventListener('dragstart',event=>{const row=event.target.closest('[data-sequence-item]');if(row?.draggable)event.dataTransfer.setData('text/plain',row.dataset.sequenceItem);});
document.addEventListener('dragover',event=>{if(event.target.closest('[data-sequence-item]'))event.preventDefault();});
document.addEventListener('drop',event=>{
 const row=event.target.closest('[data-sequence-item]');if(!row)return;event.preventDefault();
 const s=progress.session;if(view!=='session'||!s||s.submitted)return;const q=s.questions[s.index];if(q.type!=='sequence'||Object.hasOwn(s.results,q.id))return;
 const source=event.dataTransfer.getData('text/plain');if(!/^\d+$/.test(source))return;
 const target=[...row.parentElement.children].indexOf(row);
 s.answers[q.id]=moveSequence(q,s.answers[q.id],Number(source),target);persist();render();
});
