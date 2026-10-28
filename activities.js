/* Pure compound-activity definitions and answer logic. No DOM or storage. */
export const ACTIVITY_TYPES = {sequence:'Roter Zeitstrahl',multi:'Mehrfachauswahl',match:'Paare verbinden',cloze:'Lückentext',categories:'Begriffe sortieren',hotspot:'Bildstellen entdecken',truefalse:'Richtig oder falsch',correction:'Fehlerdetektiv',date:'Jahresregler'};
export const isActivity = q => Object.hasOwn(ACTIVITY_TYPES,q.type);
const normalized = v => String(v??'').trim().toLocaleLowerCase('de-CH').replace(/\s+/g,' ');
const strings = (a,min=2) => Array.isArray(a)&&a.length>=min&&a.every(x=>typeof x==='string'&&x.trim());
const uniqueStrings = a => strings(a)&&new Set(a.map(normalized)).size===a.length;
const index = (n,length) => Number.isInteger(n)&&n>=0&&n<length;
const list = (a,min=2) => Array.isArray(a)&&a.length>=min;
const fail = () => {throw new Error('Invalid compound activity definition.');};
export function validateActivity(q){
 if(!isActivity(q))return;
 switch(q.type){
 case 'sequence': if(!uniqueStrings(q.items))fail();break;
 case 'multi': if(!uniqueStrings(q.options)||!list(q.answer,1)||new Set(q.answer).size!==q.answer.length||!q.answer.every(n=>index(n,q.options.length)))fail();break;
 case 'match': if(!list(q.pairs)||!q.pairs.every(p=>p&&typeof p.left==='string'&&typeof p.right==='string')||!uniqueStrings(q.pairs.map(p=>p.left))||!uniqueStrings(q.pairs.map(p=>p.right)))fail();break;
 case 'cloze': if(!list(q.gaps,1)||!strings(q.parts,1)||q.parts.length!==q.gaps.length+1||!q.gaps.every(g=>strings(g.answers,1))||q.bank&&!strings(q.bank,1))fail();break;
 case 'categories': if(!uniqueStrings(q.groups)||!list(q.items)||!q.items.every(i=>i&&typeof i.text==='string'&&i.text.trim()&&index(i.group,q.groups.length)))fail();break;
 case 'hotspot': if(!q.media||Array.isArray(q.media)||!uniqueStrings(q.labels)||!list(q.points)||!q.points.every(p=>p&&Number.isInteger(p.number)&&p.number>0&&Number.isFinite(p.x)&&p.x>=0&&p.x<=100&&Number.isFinite(p.y)&&p.y>=0&&p.y<=100&&index(p.answer,q.labels.length))||new Set(q.points.map(p=>p.number)).size!==q.points.length)fail();break;
 case 'truefalse': if(!list(q.statements)||!q.statements.every(s=>s&&typeof s.text==='string'&&s.text.trim()&&typeof s.answer==='boolean'))fail();break;
 case 'correction': if(!list(q.tokens,1)||!strings(q.parts,1)||q.parts.length!==q.tokens.length+1||!q.tokens.every(t=>t&&typeof t.text==='string'&&t.text.trim()&&uniqueStrings(t.options)&&index(t.answer,t.options.length)))fail();break;
 case 'date': if(!Number.isInteger(q.min)||!Number.isInteger(q.max)||q.min>=q.max||q.max-q.min>500||!list(q.items,1)||!q.items.every(i=>i&&typeof i.label==='string'&&i.label.trim()&&Number.isInteger(i.answer)&&i.answer>=q.min&&i.answer<=q.max))fail();break;
 }
}
export function decodeAnswer(raw){try{const a=JSON.parse(raw);return Array.isArray(a)&&a.length<=100&&a.every(v=>['string','number','boolean'].includes(typeof v))?a:[];}catch{return [];}}
export const encodeAnswer = a => JSON.stringify(a);
export function hasAnswer(q,raw){
 if(!isActivity(q))return String(raw??'').trim().length>0;
 const a=decodeAnswer(raw);return a.some(v=>String(v).trim()!=='');
}
const correctUnits = checks => {const n=checks.filter(Boolean).length;return n===checks.length?1:n>=checks.length/2?0.5:0;};
export function gradeActivity(q,raw){
 const a=decodeAnswer(raw);
 if(!a.length)return 0;
 if(q.type!=='truefalse'&&q.type!=='cloze'&&a.some(v=>typeof v==='boolean'||typeof v==='string'&&v!==''&&!/^\d+$/.test(v)))return 0;
 if(q.type==='multi'){
  if(a.some(v=>v===''||!index(Number(v),q.options.length))||new Set(a.map(Number)).size!==a.length)return 0;
  return a.length===q.answer.length&&a.every(n=>q.answer.includes(Number(n)))?1:0;
 }
 const targets=q.type==='sequence'?q.items:q.type==='match'?q.pairs:q.type==='cloze'?q.gaps:q.type==='hotspot'?q.points:q.type==='truefalse'?q.statements:q.type==='correction'?q.tokens:q.items;
 if(a.length!==targets.length)return 0;
 if(q.type==='sequence')return a.every((v,i)=>v!==''&&Number(v)===i)?1:0;
 return correctUnits(targets.map((item,i)=>{
  const v=a[i];if(String(v).trim()==='')return false;
  switch(q.type){
   case 'match':return Number(v)===i;
   case 'cloze':return item.answers.some(s=>normalized(s)===normalized(v));
   case 'categories':return Number(v)===item.group;
   case 'hotspot':case 'correction':case 'date':return Number(v)===item.answer;
   case 'truefalse':return String(v)===String(item.answer);
   default:return false;
  }
 }));
}
function randomized(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function validOrder(a,n){return Array.isArray(a)&&a.length===n&&new Set(a).size===n&&a.every(v=>index(v,n));}
export function prepareQuestion(q,saved){
 const result={...q};
 const apply=(key,n,avoidSorted=false)=>{
  const restored=validOrder(saved?.[key],n);
  let order=restored?[...saved[key]]:randomized(Array.from({length:n},(_,i)=>i));
  if(avoidSorted&&!restored&&order.every((v,i)=>v===i))order=order.slice(1).concat(order[0]);
  result[key]=order;
 };
 if(['choice','multi'].includes(q.type))apply('optionOrder',q.options.length);
 if(q.type==='sequence')apply('itemOrder',q.items.length,true);
 if(q.type==='match')apply('rightOrder',q.pairs.length);
 return result;
}
export function activitySolution(q){
 switch(q.type){
 case 'sequence':return q.items.map((s,i)=>`${i+1}. ${s}`).join('\n');
 case 'multi':return q.answer.map(i=>q.options[i]).join('; ');
 case 'match':return q.pairs.map(p=>`${p.left} → ${p.right}`).join('\n');
 case 'cloze':return q.parts.map((s,i)=>s+(q.gaps[i]?.answers[0]??'')).join('');
 case 'categories':return q.items.map(i=>`${i.text} → ${q.groups[i.group]}`).join('\n');
 case 'hotspot':return q.points.map(p=>`${p.number}: ${q.labels[p.answer]}`).join('\n');
 case 'truefalse':return q.statements.map(s=>`${s.text} → ${s.answer?'Richtig':'Falsch'}`).join('\n');
 case 'correction':return q.parts.map((s,i)=>s+(q.tokens[i]?q.tokens[i].options[q.tokens[i].answer]:'')).join('');
 case 'date':return q.items.map(i=>`${i.label}: ${i.answer}`).join('\n');
 default:return '';
 }
}
export function activityAnswerLabel(q,raw){
 const a=decodeAnswer(raw);if(!hasAnswer(q,raw))return 'Keine Antwort';
 const value=(i,lookup)=>a[i]!==undefined&&a[i]!==''?(lookup?lookup[Number(a[i])]??'—':String(a[i])):'—';
 switch(q.type){
 case 'sequence':return a.map((_,i)=>value(i,q.items)).join(' → ');
 case 'multi':return a.map((_,i)=>value(i,q.options)).join('; ');
 case 'match':return q.pairs.map((p,i)=>`${p.left}: ${value(i,q.pairs.map(p=>p.right))}`).join('; ');
 case 'cloze':return q.parts.map((s,i)=>s+(i<q.gaps.length?value(i):'')).join('');
 case 'categories':return q.items.map((p,i)=>`${p.text}: ${value(i,q.groups)}`).join('; ');
 case 'hotspot':return q.points.map((p,i)=>`${p.number}: ${value(i,q.labels)}`).join('; ');
 case 'truefalse':return q.statements.map((s,i)=>`${s.text}: ${a[i]==='true'?'Richtig':a[i]==='false'?'Falsch':'—'}`).join('; ');
 case 'correction':return q.parts.map((s,i)=>s+(q.tokens[i]?value(i,q.tokens[i].options):'')).join('');
 case 'date':return q.items.map((p,i)=>`${p.label}: ${value(i)}`).join('; ');
 default:return '';
 }
}
