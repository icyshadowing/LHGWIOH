// quiz.js

// DOM
const cards = {
  mainMenu: document.getElementById('mainMenu'),
  packSelectCard: document.getElementById('packSelectCard'),
  quizCard: document.getElementById('quizCard'),
  reviewCard: document.getElementById('reviewCard'),
  viewPacksCard: document.getElementById('viewPacksCard')
};

const packSelect = document.getElementById('packSelect');
const startQuizBtn = document.getElementById('startQuizBtn');
const startAdvancedQuizBtn = document.getElementById('startAdvancedQuizBtn');
const startAdvancedQuizFromSelectBtn = document.getElementById('startAdvancedQuizFromSelectBtn');

const quizRef = document.getElementById('quizRef');
const inputTitle = document.getElementById('inputTitle');
const inputVerse = document.getElementById('inputVerse');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const skipBtn = document.getElementById('skipBtn');
const nextBtn = document.getElementById('nextBtn');
const retryBtn = document.getElementById('retryBtn');
const backBtn = document.getElementById('backBtn');
const backBtnReview = document.getElementById('backBtnReview');

const reviewHeading = document.getElementById('reviewHeading');
const correctTitle = document.getElementById('correctTitle');
const correctVerse = document.getElementById('correctVerse');
const userTitleEl = document.getElementById('userTitleEl');
const userVerseBox = document.getElementById('userVerseBox');

const viewPacksBtn = document.getElementById('viewPacksBtn');
const packsContainer = document.getElementById('packsContainer');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const backToMenuBtn2 = document.getElementById('backToMenuBtn2');

// session states
let session = null;
let advSession = null;

// --- UTILITIES ---
function shuffle(array) { for (let i=array.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]];} return array;}
function tokenize(s){return s?s.trim().split(/\s+/):[];}
function normalizeWord(w){return (w||'').replace(/[\W_]+/g,'').toLowerCase();}
function strike(text){return (text||'').split('').map(c=>c+'\u0336').join('');}
function escapeHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// --- CARD SWITCHING ---
function showCard(card){Object.values(cards).forEach(c=>c.classList.remove('active-card')); card.classList.add('active-card');}

// --- PACK SELECT ---
function populatePackSelect(){
  packSelect.innerHTML='';
  for(let packName in VERSE_PACKS){
    const opt=document.createElement('option');
    opt.value=packName;
    opt.textContent=packName;
    packSelect.appendChild(opt);
  }
}

// --- ORIGINAL QUIZ ---
function startOriginalQuiz(){
  const packName=packSelect.value;
  if(!packName){alert('Select a pack'); return;}
  const pack = VERSE_PACKS[packName];
  session={pack, remaining:shuffle(pack.slice()), current:null};
  showCard(cards.quizCard);
  renderNextOriginal();
}

function renderNextOriginal(){
  if(!session || !session.remaining.length){ alert('Finished!'); backToMain(); return; }
  session.current=session.remaining.pop();
  quizRef.textContent=session.current.ref;
  inputTitle.value=''; inputVerse.value='';
}

function showReview(uTitle,uVerse){
  const c=session.current;
  showCard(cards.reviewCard);
  reviewHeading.textContent=c.ref;
  correctTitle.textContent=c.title; correctVerse.textContent=c.verse;
  userTitleEl.textContent=uTitle||'—';
  userVerseBox.innerHTML=highlightComparison(c.verse,uVerse);
  userTitleEl.style.color=(uTitle||'').trim().toLowerCase()===c.title.trim().toLowerCase()?'black':'blue';
}

function highlightComparison(correct,user){
  const cw=tokenize(correct), uw=tokenize(user); const dp=Array(cw.length+1).fill(null).map(()=>Array(uw.length+1).fill(0));
  for(let i=0;i<=cw.length;i++) dp[i][0]=i;
  for(let j=0;j<=uw.length;j++) dp[0][j]=j;
  for(let i=1;i<=cw.length;i++){
    for(let j=1;j<=uw.length;j++){
      const cost=normalizeWord(cw[i-1])===normalizeWord(uw[j-1])?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
    }
  }
  let i=cw.length,j=uw.length,res=[];
  while(i>0||j>0){
    if(i>0 && j>0 && normalizeWord(cw[i-1])===normalizeWord(uw[j-1])){res.unshift(`<span class="word ok">${escapeHtml(uw[j-1])}</span>`);i--;j--;}
    else if(j>0 && (i===0||dp[i][j-1]<=dp[i-1][j])){res.unshift(`<span class="word extra">${strike(escapeHtml(uw[j-1]))}</span>`);j--;}
    else if(i>0 && (j===0||dp[i-1][j]<dp[i][j-1])){res.unshift(`<span class="word missing">${escapeHtml(cw[i-1])}</span>`);i--;}
    else{i--;j--;}
  }
  return res.join(' ');
}

// --- ADVANCED QUIZ ---
function startAdvancedQuiz(){
  showCard(cards.packSelectCard);
  packSelect.multiple=true;
}

function startAdvancedQuizFromSelect(){
  const selected=[...packSelect.selectedOptions].map(o=>o.value);
  if(!selected.length) { alert('Select at least one pack'); return; }
  let pool=[]; selected.forEach(p=>pool=pool.concat(VERSE_PACKS[p]||[]));
  if(!pool.length){alert('No verses'); return;}
  pool=shuffle(pool).slice(0,12);
  advSession={verses:pool,index:0,results:[],finished:false};
  showCard(cards.quizCard); renderNextAdvanced();
}

function renderNextAdvanced(){
  if(!advSession || advSession.index>=advSession.verses.length){ showAdvancedReview(); return; }
  const v=advSession.verses[advSession.index];
  quizRef.textContent=v.ref; inputTitle.value=''; inputVerse.value='';
}

function submitAdvanced(){
  if(!advSession) return;
  const v=advSession.verses[advSession.index];
  const userTitle=inputTitle.value.trim(); const userVerse=inputVerse.value.trim();
  const score=-Math.min(normalizeWord(userTitle)!==normalizeWord(v.title)?1:0,4);
  advSession.results.push({ref:v.ref,title:v.title,verse:v.verse,userTitle,userVerse,score,highlighted:highlightComparison(v.verse,userVerse)});
  advSession.index++; renderNextAdvanced();
}

function showAdvancedReview(){
  let html=''; let total=0;
  advSession.results.forEach(r=>{ total+=r.score; html+=`<div class="adv-result-block"><h3>${r.ref} (Score:${r.score})</h3><p><strong>Correct Title:</strong>${r.title}</p><p><strong>Your Title:</strong>${r.userTitle}</p><p><strong>Correct Verse:</strong>${r.verse}</p><p><strong>Your Verse:</strong></p>${r.highlighted}<hr></div>`;});
  showCard(cards.reviewCard); correctTitle.textContent='Total Score:'+total; correctVerse.innerHTML=html;
}

// --- BUTTONS ---
goToPackSelectBtn.onclick=()=>{ showCard(cards.packSelectCard); packSelect.multiple=false; populatePackSelect();}
startQuizBtn.onclick=startOriginalQuiz;
startAdvancedQuizBtn.onclick=startAdvancedQuiz;
startAdvancedQuizFromSelectBtn.onclick=startAdvancedQuizFromSelect;
submitAnswerBtn.onclick=()=>{ if(session) showReview(inputTitle.value,inputVerse.value); else if(advSession) submitAdvanced();};
skipBtn.onclick=()=>{ if(session) showReview('',''); else if(advSession) submitAdvanced();}
nextBtn.onclick=()=>{ if(session) renderNextOriginal();}
retryBtn.onclick=()=>{ if(session) session.remaining.push(session.current); renderNextOriginal();}
backBtn.onclick=backBtnReview.onclick=()=>{ showCard(cards.mainMenu); session=null; advSession=null; packSelect.multiple=false; };

// --- INIT ---
document.addEventListener('DOMContentLoaded',()=>{ populatePackSelect(); showCard(cards.mainMenu); });
