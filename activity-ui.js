import {escapeHTML as e,safeURL} from './core.js';
import {decodeAnswer,encodeAnswer,validOrder} from './activities.js';
const blank = (q,a,n) => Array.from({length:n},(_,i)=>a[i]??'');
const select = (i,label,options,value,locked) => `<label class="activity-field"><span>${e(label)}</span><select data-part="${i}" name="activity" ${locked?'disabled':''}><option value="">Bitte wählen …</option>${options.map(([id,label])=>`<option value="${id}" ${String(value)===String(id)?'selected':''}>${e(label)}</option>`).join('')}</select></label>`;
const entries = list => list.map((s,i)=>[i,s]);
const b = (label,action,item='',extra='') => `<button type="button" class="activity-button" data-activity-action="${action}" data-item="${item}" ${extra}>${label}</button>`;
export function renderHotspots(q,interactive=false,zoomable=true){
 return `<figure class="learning-media hotspot-media"><div class="hotspot-canvas"><img src="${e(safeURL(q.media.src,true))}" alt="${e(q.media.alt)}" loading="eager">${q.points.map((p,i)=>interactive?`<button type="button" class="image-pin" style="left:${p.x}%;top:${p.y}%" data-activity-action="spot" data-item="${i}" aria-label="Bildstelle ${p.number}">${p.number}</button>`:`<span class="image-pin" style="left:${p.x}%;top:${p.y}%">${p.number}</span>`).join('')}</div><figcaption>${e(q.media.caption||'Lernorix · nummerierte Bildstellen')} · ${interactive?'Zahl anklicken und zuordnen.':'Nummern bezeichnen die untersuchten Stellen.'}</figcaption>${zoomable?'<button type="button" class="btn image-zoom-button" data-image-zoom>Bild vergrössern</button>':''}</figure>`;
}
export function renderActivity(q,raw='',locked=false){
 const a=decodeAnswer(raw);let body='';
 const disabled=locked?'disabled':'';
 switch(q.type){
 case 'sequence':{
  const order=validOrder(a.map(Number),q.items.length)?a.map(Number):q.itemOrder;
  body=`<p class="activity-instruction">Bringe die Blöcke von früh nach spät. Ziehen oder mit ↑ / ↓ verschieben; danach prüfen.</p><ol class="red-timeline">${order.map((item,i)=>`<li data-sequence-item="${item}" draggable="${!locked}"><span class="timeline-number">${i+1}</span><span class="timeline-text">${e(q.items[item])}</span><div class="timeline-controls">${b('↑','up',item,`${disabled||i===0?'disabled':''} aria-label="${e(q.items[item])} früher"`)}${b('↓','down',item,`${disabled||i===order.length-1?'disabled':''} aria-label="${e(q.items[item])} später"`)}</div></li>`).join('')}</ol>${!locked?b('Diese Reihenfolge festlegen','confirm-order') : ''}`;
  break;}
 case 'multi':body=`<fieldset class="options"><legend>Mehrere Antworten können richtig sein.</legend>${q.optionOrder.map(i=>`<label class="option"><input type="checkbox" name="activity" value="${i}" ${a.map(Number).includes(i)?'checked':''} ${disabled}>${e(q.options[i])}</label>`).join('')}</fieldset>`;break;
 case 'match':body=`<p class="activity-instruction">Verbinde jede linke Karte mit dem passenden Gegenstück. Jede Antwort gehört genau zu einem Paar.</p><div class="pair-grid">${q.pairs.map((p,i)=>select(i,p.left,q.rightOrder.map(j=>[j,q.pairs[j].right]),a[i],locked)).join('')}</div>`;break;
 case 'cloze':body=`<p class="activity-instruction">Vervollständige den Text.${q.bank?' Nutze den Wortvorrat.':''}</p>${q.bank?`<div class="word-bank" aria-label="Wortvorrat">${q.bank.map(w=>`<span>${e(w)}</span>`).join('')}</div>`:''}<div class="cloze-text">${q.parts.map((p,i)=>e(p)+(q.gaps[i]?`<input type="text" name="activity" data-part="${i}" aria-label="Lücke ${i+1}" value="${e(a[i]??'')}" autocomplete="off" ${disabled}>`:'')).join('')}</div>`;break;
 case 'categories':{
  const values=blank(q,a,q.items.length);
  const selected=Number.isInteger(q.selectedItem)?q.selectedItem:null;
  const chip=(i)=>b(e(q.items[i].text),'pick',i,`${disabled} aria-pressed="${selected===i}"`);
  body=`<p class="activity-instruction">Wähle einen Begriff und danach seine Gruppe. Zum Ändern den Begriff erneut auswählen.</p><div class="category-bank" aria-label="Noch zuzuordnen">${q.items.map((_,i)=>values[i]===''?chip(i):'').join('')||'<span>Alle Begriffe sind einsortiert.</span>'}</div><div class="category-grid">${q.groups.map((g,j)=>`<section class="category-zone">${b(e(g),'place',j,disabled)}<div>${q.items.map((_,i)=>String(values[i])===String(j)?chip(i):'').join('')}</div></section>`).join('')}</div><p class="small muted" role="status">${selected===null?'Erst einen Begriff wählen.':`${e(q.items[selected].text)} gewählt – jetzt eine Gruppe anklicken.`}</p>`;break;}
 case 'hotspot':body=`<div class="pair-grid">${q.points.map((p,i)=>select(i,`Was siehst du bei Nummer ${p.number}?`,entries(q.labels),a[i],locked)).join('')}</div>`;break;
 case 'truefalse':body=`<div class="verdict-list">${q.statements.map((s,i)=>`<fieldset class="verdict-row"><legend>${e(s.text)}</legend><div class="verdict-options">${[['true','Richtig'],['false','Falsch']].map(([v,label])=>`<label><input type="radio" name="verdict-${i}" data-part="${i}" value="${v}" ${String(a[i])===v?'checked':''} ${disabled}>${label}</label>`).join('')}</div></fieldset>`).join('')}</div>`;break;
 case 'correction':body=`<p class="activity-instruction">Prüfe die markierten Stellen im Text: Ersetze Fehler, richtige Angaben lässt du unverändert.</p><div class="correction-text">${q.parts.map((p,i)=>e(p)+(q.tokens[i]?`<label class="correction-token"><span class="small">${e(q.tokens[i].text)}</span><select name="activity" data-part="${i}" aria-label="Textstelle ${i+1}: ${e(q.tokens[i].text)}" ${disabled}><option value="">Prüfen …</option>${q.tokens[i].options.map((o,j)=>`<option value="${j}" ${String(a[i])===String(j)?'selected':''}>${e(o)}</option>`).join('')}</select></label>`:'')).join('')}</div>`;break;
 case 'date':body=`<p class="activity-instruction">Schiebe jedes Ereignis auf das richtige Jahr. Mit Tab und Pfeiltasten ebenfalls bedienbar. Mit «Jahr übernehmen» kannst du auch das bereits angezeigte Startjahr wählen.</p><div class="year-sliders">${q.items.map((item,i)=>`<div class="year-control"><label for="year-${i}"><strong>${e(item.label)}</strong></label><output data-year-output="${i}" aria-live="polite">${a[i]!==undefined&&a[i]!==''?e(a[i]):'Noch nicht gesetzt'}</output><input id="year-${i}" type="range" name="activity" data-part="${i}" data-year="true" data-touched="${a[i]!==undefined&&a[i]!==''}" min="${q.min}" max="${q.max}" step="1" value="${a[i]!==undefined&&a[i]!==''?e(a[i]):q.min}" aria-label="Jahr: ${e(item.label)}" ${disabled}><span class="row spread small muted"><span>${q.min}</span><span>${q.max}</span></span>${b('Jahr übernehmen','accept-year',i,`${disabled} aria-label="Jahr übernehmen: ${e(item.label)}"`)}</div>`).join('')}</div>`;break;
 }
 return `<div class="activity activity-${q.type}" data-activity-root data-state="${e(raw??'')}" data-locked="${locked}">${body}</div>`;
}
export function readActivity(q,root){
 if(!root)return '';
 if(['sequence','categories'].includes(q.type))return root.dataset.state||'';
 if(q.type==='multi')return encodeAnswer([...root.querySelectorAll('input:checked')].map(el=>Number(el.value)));
 if(q.type==='truefalse')return encodeAnswer(q.statements.map((_,i)=>root.querySelector(`input[data-part="${i}"]:checked`)?.value??''));
 const n=q.type==='match'?q.pairs.length:q.type==='cloze'?q.gaps.length:q.type==='hotspot'?q.points.length:q.type==='correction'?q.tokens.length:q.items.length;
 return encodeAnswer(Array.from({length:n},(_,i)=>{const el=root.querySelector(`[data-part="${i}"]`);return q.type==='date'&&el?.dataset.touched!=='true'?'':el?.value??'';}));
}
export function moveSequence(q,raw,item,target){
 const a=decodeAnswer(raw).map(Number);const order=validOrder(a,q.items.length)?a:[...q.itemOrder];
 const from=order.indexOf(item);if(from<0||target<0||target>=order.length)return raw;
 order.splice(from,1);order.splice(target,0,item);return encodeAnswer(order);
}
export function activityAction(q,raw,action,item,selectedItem){
 const n=Number(item);
 if(q.type==='sequence'){
  const a=decodeAnswer(raw).map(Number);const order=validOrder(a,q.items.length)?a:q.itemOrder;
  if(action==='confirm-order')return {answer:encodeAnswer(order)};
  if(['up','down'].includes(action))return {answer:moveSequence(q,raw,n,order.indexOf(n)+(action==='up'?-1:1))};
 }
 if(q.type==='categories'){
  if(action==='pick'&&q.items[n])return {selectedItem:n};
  if(action==='place'&&Number.isInteger(selectedItem)&&q.items[selectedItem]&&q.groups[n]){const a=blank(q,decodeAnswer(raw),q.items.length);a[selectedItem]=n;return {answer:encodeAnswer(a),selectedItem:null};}
 }
 return null;
}
export function activityPrint(q){
 const lines=items=>`<ol class="paper-activity">${items.map(s=>`<li>${s}</li>`).join('')}</ol>`;
 switch(q.type){
 case 'sequence':return '<p>Trage die zeitliche Rangfolge in die Kästchen ein (1 = frühestes).</p>'+lines(q.itemOrder.map(i=>`[ ___ ] ${e(q.items[i])}`));
 case 'multi':return '<p>Mehrere Antworten können richtig sein.</p>'+q.optionOrder.map(i=>`<div class="print-option">☐ ${e(q.options[i])}</div>`).join('');
 case 'match':return '<p>Ordne jedem Begriff den Buchstaben seines Gegenstücks zu.</p>'+lines(q.pairs.map(p=>`${e(p.left)} → ____`))+`<div class="word-bank">${q.rightOrder.map((j,i)=>`<span>${String.fromCharCode(65+i)}: ${e(q.pairs[j].right)}</span>`).join('')}</div>`;
 case 'cloze':return (q.bank?`<p>Wortvorrat: ${q.bank.map(e).join(' · ')}</p>`:'')+`<p class="paper-cloze">${q.parts.map((s,i)=>e(s)+(q.gaps[i]?' __________ ':'' )).join('')}</p>`;
 case 'categories':return '<p>Gruppen: '+q.groups.map(e).join(' · ')+'</p>'+lines(q.items.map(i=>`${e(i.text)} → __________________`));
 case 'hotspot':return lines(q.points.map(p=>`Bildstelle ${p.number}: __________________`))+`<p>Begriffe: ${q.labels.map(e).join(' · ')}</p>`;
 case 'truefalse':return lines(q.statements.map(s=>`${e(s.text)}<br>☐ Richtig &nbsp; ☐ Falsch`));
 case 'correction':return '<p>Prüfe und korrigiere die markierten Textstellen:</p><p>'+q.parts.map((p,i)=>e(p)+(q.tokens[i]?`<strong>[${e(q.tokens[i].text)}]</strong>`:'')).join('')+'</p>'+lines(q.tokens.map((t,i)=>`Stelle ${i+1}: ${t.options.map(e).join(' / ')} → __________`));
 case 'date':return `<p>Jahresbereich ${q.min}–${q.max}</p>`+lines(q.items.map(i=>`${e(i.label)} → Jahr: ______`));
 default:return '';
 }
}
