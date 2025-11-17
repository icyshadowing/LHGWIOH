/* ===========================
   QUIZ SCRIPT
   =========================== */

/* ----- DOM REFERENCES ----- */
const packSelect = document.getElementById('packSelect');
const packSelectCard = document.getElementById('packSelectCard');
const startQuizBtn = document.getElementById('startQuizBtn');
const startAdvancedQuizBtn = document.getElementById('startAdvancedQuizBtn');
const quizCard = document.getElementById('quizCard');
const quizRef = document.getElementById('quizRef');
const inputTitle = document.getElementById('inputTitle');
const inputVerse = document.getElementById('inputVerse');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const skipBtn = document.getElementById('skipBtn');
const reviewCard = document.getElementById('reviewCard');
const reviewHeading = document.getElementById('reviewHeading');
const correctTitle = document.getElementById('correctTitle');
const correctVerse = document.getElementById('correctVerse');
const userTitleEl = document.getElementById('userTitleEl');
const userVerseBox = document.getElementById('userVerseBox');
const nextBtn = document.getElementById('nextBtn');
const retryBtn = document.getElementById('retryBtn');
const backBtn = document.getElementById('backBtn');
const mainMenu = document.getElementById('mainMenu');
const goToPackSelectBtn = document.getElementById('goToPackSelectBtn');
const backToMainBtn = document.getElementById('backToMainBtn');

const viewPacksBtn = document.getElementById('viewPacksBtn');
const viewPacksCard = document.getElementById('viewPacksCard');
const packsContainer = document.getElementById('packsContainer');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const backToMenuBtn2 = document.getElementById('backToMenuBtn2');

/* ----- UTILITIES ----- */
function shuffle(array) {
  for (let i=array.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function tokenize(s) { return s ? s.trim().split(/\s+/) : []; }
function normalizeWord(w) { return (w||'').replace(/[\W_]+/g,'').toLowerCase(); }
function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function strike(text) { return (text||'').split('').map(c => c+'\u0336').join(''); }

/* Highlight differences between correct and user verse */
function highlightComparison(correct, user) {
  const cw = tokenize(correct);
  const uw = tokenize(user);
  const dp = Array(cw.length+1).fill(null).map(()=>Array(uw.length+1).fill(0));

  for(let i=0;i<=cw.length;i++) dp[i][0]=i;
  for(let j=0;j<=uw.length;j++) dp[0][j]=j;

  for(let i=1;i<=cw.length;i++){
    for(let j=1;j<=uw.length;j++){
      const cost = normalizeWord(cw[i-1])===normalizeWord(uw[j-1])?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }

  let i=cw.length, j=uw.length, result=[];
  while(i>0||j>0){
    if(i>0 && j>0 && normalizeWord(cw[i-1])===normalizeWord(uw[j-1])){
      result.unshift(`<span class="word ok">${escapeHtml(uw[j-1])}</span>`); i--; j--;
    } else if(j>0 && (i===0 || dp[i][j-1]<=dp[i-1][j])){
      result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j-1]))}</span>`); j--;
    } else if(i>0 && (j===0 || dp[i-1][j]<dp[i][j-1])){
      result.unshift(`<span class="word missing">${escapeHtml(cw[i-1])}</span>`); i--;
    } else {
      if(j>0) result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j-1]))}</span>`);
      if(i>0) result.push(`<span class="word missing">${escapeHtml(cw[i-1])}</span>`);
      i--; j--;
    }
  }
  return result.join(' ');
}

/* ----- POPULATE PACK SELECT ----- */
function populatePackSelect() {
  if(!packSelect) return;
  packSelect.innerHTML = '';
  for(const packName in VERSE_PACKS){
    const opt = document.createElement('option');
    opt.value = packName;
    opt.textContent = packName;
    packSelect.appendChild(opt);
  }
}

/* ----- ORIGINAL QUIZ ----- */
let session = null;

function renderNext() {
  if(!session || !session.remaining || session.remaining.length===0){
    alert('You have finished all verses in this pack!');
    backToMain();
    return;
  }
  session.current = session.remaining.pop();
  quizRef.textContent = session.current.ref;
  inputTitle.value='';
  inputVerse.value='';
}

function showReview(uTitle,uVerse){
  if(quizCard) quizCard.style.display='none';
  if(reviewCard) reviewCard.style.display='block';

  const c = session && session.current;
  if(!c) return;

  reviewHeading.textContent = c.ref||'';
  correctTitle.textContent = c.title||'';
  correctVerse.textContent = c.verse||'';

  userTitleEl.textContent = uTitle||'—';
  userVerseBox.innerHTML = highlightComparison(c.verse,uVerse);

  if((uTitle||'').trim().toLowerCase()===(c.title||'').trim().toLowerCase()){
    userTitleEl.style.color='black';
  } else userTitleEl.style.color='blue';
}

/* ----- ADVANCED QUIZ ----- */
let advSession = null;

function startAdvancedQuizMode(){
  if(!packSelect) return;
  packSelect.multiple = true;
  if(packSelectCard) packSelectCard.style.display='block';
  if(mainMenu) mainMenu.style.display='none';

  // Next button on packSelect will start advanced
  startAdvancedQuizBtn.onclick = () => {
    const selected = [...packSelect.selectedOptions].map(o=>o.value);
    if(selected.length===0){ alert('Select at least one pack'); return; }

    let pool = [];
    selected.forEach(p=>{
      pool = pool.concat(VERSE_PACKS[p]||[]);
    });
    if(!pool.length){ alert('No verses found'); return; }
    pool = shuffle(pool).slice(0,12);

    advSession = { verses: pool, index:0, results:[], finished:false };

    packSelectCard.style.display='none';
    quizCard.style.display='block';
    mainMenu.style.display='none';

    loadAdvancedQuestion();
  };
}

function loadAdvancedQuestion(){
  if(!advSession) return;
  const v = advSession.verses[advSession.index];
  quizRef.textContent = v.ref||'';
  inputTitle.value='';
  inputVerse.value='';

  // Only one button for advanced
  nextBtn.style.display='inline-block';
  nextBtn.textContent='Next';
  retryBtn.style.display='none';
  skipBtn.style.display='none';
  backBtn.style.display='none';

  nextBtn.onclick = () => submitAdvancedAnswer();
}

function submitAdvancedAnswer(){
  if(!advSession) return;
  const v = advSession.verses[advSession.index];
  const userTitle = inputTitle.value.trim();
  const userVerse = inputVerse.value.trim();

  const sc = calculateScore(v.title,v.verse,userTitle,userVerse);

  advSession.results.push({
    ref:v.ref,
    title:v.title,
    verse:v.verse,
    userTitle,
    userVerse,
    score:-sc.totalPenalty,
    highlighted: highlightComparison(v.verse,userVerse)
  });

  advSession.index++;
  if(advSession.index>=advSession.verses.length){
    advSession.finished=true;
    showAdvancedReviewPage();
  } else loadAdvancedQuestion();
}

function calculateScore(title,verse,userTitle,userVerse){
  const titlePenalty = normalizeWord(title)!==normalizeWord(userTitle)?1:0;
  const refWords = tokenize(verse);
  const userWords = tokenize(userVerse);

  const matched = lcsIndexPairs(refWords,userWords);
  const matchedRef = new Set(matched.map(p=>p[0]));
  const matchedUser = new Set(matched.map(p=>p[1]));

  const missing = refWords.filter((_,i)=>!matchedRef.has(i));
  const extra = userWords.filter((_,i)=>!matchedUser.has(i));

  const pairCount = Math.min(missing.length,extra.length);
  const bodyMistakes = pairCount + (missing.length-pairCount) + (extra.length-pairCount);
  const bodyPenalty = Math.min(bodyMistakes,4);

  return { titlePenalty, bodyPenalty, totalPenalty: Math.min(titlePenalty+bodyPenalty,5) };
}

function showAdvancedReviewPage(){
  quizCard.style.display='none';
  reviewCard.style.display='block';
  reviewHeading.textContent='Advanced Quiz Review';

  let totalScore=0, html='';
  advSession.results.forEach((r,i)=>{
    totalScore += r.score;
    html += `
      <div class="adv-result-block">
        <h3>${escapeHtml(r.ref)} (Verse ${i+1} — Score: ${r.score})</h3>
        <p><strong>Correct Title:</strong> ${escapeHtml(r.title)}</p>
        <p><strong>Your Title:</strong> ${escapeHtml(r.userTitle||'—')}</p>
        <p><strong>Correct Verse:</strong> ${escapeHtml(r.verse)}</p>
        <p><strong>Your Verse:</strong></p>
        <p>${r.highlighted}</p>
        <hr>
      </div>
    `;
  });

  correctTitle.textContent='Total Score: '+totalScore;
  correctVerse.innerHTML=html;

  nextBtn.style.display='inline-block';
  nextBtn.textContent='Back to Main';
  nextBtn.onclick=()=>{
    advSession=null;
    currentMode=null;
    backToMain();
  };
  retryBtn.style.display='none';
  skipBtn.style.display='none';
  backBtn.style.display='none';
}

/* ----- LCS for advanced scoring ----- */
function lcsIndexPairs(a,b){
  const n=a.length,m=b.length;
  const dp=Array.from({length:n+1},()=>Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--){
    for(let j=m-1;j>=0;j--){
      dp[i][j]=normalizeWord(a[i])===normalizeWord(b[j])?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  let i=0,j=0,pairs=[];
  while(i<n&&j<m){
    if(normalizeWord(a[i])===normalizeWord(b[j])){pairs.push([i,j]);i++;j++;}
    else if(dp[i+1][j]>=dp[i][j+1]) i++; else j++;
  }
  return pairs;
}

/* ----- BUTTON EVENTS ----- */
startQuizBtn && (startQuizBtn.onclick=()=>{
  const packName = packSelect.value;
  if(!packName){ alert('Pick a pack first'); return; }
  const pack = VERSE_PACKS[packName];
  session={ pack, remaining: shuffle(pack.slice()), current:null };
  packSelectCard.style.display='none';
  reviewCard.style.display='none';
  quizCard.style.display='block';
  renderNext();
});

submitAnswerBtn && (submitAnswerBtn.onclick=()=>{
  if(advSession && !advSession.finished) submitAdvancedAnswer();
  else if(session && session.current) showReview(inputTitle.value.trim(),inputVerse.value.trim());
});

skipBtn && (skipBtn.onclick=()=>{
  if(advSession && !advSession.finished) submitAdvancedAnswer();
  else showReview("","");
});

nextBtn && (nextBtn.onclick=()=>{
  if(session && session.remaining && session.remaining.length>0){
    reviewCard.style.display='none';
    quizCard.style.display='block';
    renderNext();
  }
});

retryBtn && (retryBtn.onclick=()=>{
  if(!session || !session.current) return;
  session.remaining.push(session.current);
  reviewCard.style.display='none';
  quizCard.style.display='block';
  renderNext();
});

backBtn && (backBtn.onclick=backToMain);

goToPackSelectBtn && (goToPackSelectBtn.onclick=()=>{
  mainMenu.style.display='none';
  packSelectCard.style.display='block';
  populatePackSelect();
});

backToMainBtn && (backToMainBtn.onclick=()=>{
  packSelectCard.style.display='none';
  mainMenu.style.display='block';
});

viewPacksBtn && (viewPacksBtn.onclick=()=>{
  packSelectCard.style.display='none';
  mainMenu.style.display='none';
  viewPacksCard.style.display='block';
  renderPacks();
});

backToMenuBtn && (backToMenuBtn.onclick=()=>{
  viewPacksCard.style.display='none';
  mainMenu.style.display='block';
});
backToMenuBtn2 && (backToMenuBtn2.onclick=()=>{
  viewPacksCard.style.display='none';
  mainMenu.style.display='block';
});

/* ----- PACKS RENDER ----- */
function renderPacks(){
  if(!packsContainer) return;
  packsContainer.innerHTML='';
  for(const packName in VERSE_PACKS){
    const card = document.createElement('div');
    card.className='pack-card';
    card.innerHTML=`<h3>${escapeHtml(packName)}</h3>`;
    card.onclick=()=>showPackVerses(packName);
    packsContainer.appendChild(card);
  }
}

function showPackVerses(packName){
  const pack = VERSE_PACKS[packName];
  if(!packsContainer) return;
  packsContainer.innerHTML='';

  const topBtn=document.createElement('button');
  topBtn.textContent='← Back to Packs'; topBtn.className='ghost';
  topBtn.onclick=renderPacks; packsContainer.appendChild(topBtn);

  const title=document.createElement('h3');
  title.textContent=packName;
  packsContainer.appendChild(title);

  pack.forEach(v=>{
    const vCard=document.createElement('div');
    vCard.className='verse-card';
    vCard.innerHTML=`
      <h4>${escapeHtml(v.title)}</h4>
      <p><strong>${escapeHtml(v.ref)}</strong></p>
      <p>${escapeHtml(v.verse)}</p>
    `;
    packsContainer.appendChild(vCard);
  });

  const bottomBtn=document.createElement('button');
  bottomBtn.textContent='← Back to Packs'; bottomBtn.className='ghost';
  bottomBtn.onclick=renderPacks; packsContainer.appendChild(bottomBtn);
}

/* ----- INIT ----- */
document.addEventListener('DOMContentLoaded',()=>{
  populatePackSelect();
  if(packSelect) packSelect.multiple=false;
  startAdvancedQuizMode(); // wire SMC to show select pack page first
});
