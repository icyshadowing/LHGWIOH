/* =========================
   Full Quiz Script
   Supports:
   - Original single-pack quiz
   - Advanced Multi-pack (SMC) quiz
   - Color-coded word review
   ========================= */

/* -------------------------
   DOM References
------------------------- */
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
const mainMenu = document.getElementById("mainMenu");
const goToPackSelectBtn = document.getElementById("goToPackSelectBtn");
const backToMainBtn = document.getElementById("backToMainBtn");

const viewPacksBtn = document.getElementById("viewPacksBtn");
const viewPacksCard = document.getElementById("viewPacksCard");
const packsContainer = document.getElementById("packsContainer");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const backToMenuBtn2 = document.getElementById("backToMenuBtn2");

/* -------------------------
   Utility Functions
------------------------- */
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function tokenize(s){return s?s.trim().split(/\s+/):[];}
function normalizeWord(w){return (w||'').replace(/[\W_]+/g,'').toLowerCase();}
function escapeHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function strike(text){return (text||'').split('').map(c=>c+'\u0336').join('');}

/* Highlight differences between correct verse and user input */
function highlightComparison(correct,user){
  const cw=tokenize(correct);
  const uw=tokenize(user);
  const dp=Array(cw.length+1).fill(null).map(()=>Array(uw.length+1).fill(0));
  for(let i=0;i<=cw.length;i++) dp[i][0]=i;
  for(let j=0;j<=uw.length;j++) dp[0][j]=j;
  for(let i=1;i<=cw.length;i++){
    for(let j=1;j<=uw.length;j++){
      const cost=normalizeWord(cw[i-1])===normalizeWord(uw[j-1])?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
    }
  }
  let i=cw.length,j=uw.length,result=[];
  while(i>0||j>0){
    if(i>0&&j>0&&normalizeWord(cw[i-1])===normalizeWord(uw[j-1])){
      result.unshift(`<span class="word ok">${escapeHtml(uw[j-1])}</span>`);i--;j--;
    } else if(j>0&&(i===0||dp[i][j-1]<=dp[i-1][j])){
      result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j-1]))}</span>`);j--;
    } else if(i>0&&(j===0||dp[i-1][j]<dp[i][j-1])){
      result.unshift(`<span class="word missing">${escapeHtml(cw[i-1])}</span>`);i--;
    } else {
      if(j>0) result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j-1]))}</span>`);
      if(i>0) result.push(`<span class="word missing">${escapeHtml(cw[i-1])}</span>`);
      i--;j--;
    }
  }
  return result.join(' ');
}

/* Populate the select box */
function populatePackSelect(){
  if(!packSelect) return;
  packSelect.innerHTML='';
  for(let packName in VERSE_PACKS){
    const opt=document.createElement("option");
    opt.value=packName;
    opt.textContent=packName;
    packSelect.appendChild(opt);
  }
}

/* -------------------------
   Quiz State
------------------------- */
let session=null;         // original single-pack quiz
let advSession=null;      // advanced multi-pack quiz
let advancedMode=false;   // flag when SMC is selected

/* -------------------------
   Navigation
------------------------- */
function backToMain(){
  if(reviewCard) reviewCard.style.display='none';
  if(quizCard) quizCard.style.display='none';
  if(packSelectCard) packSelectCard.style.display='none';
  if(viewPacksCard) viewPacksCard.style.display='none';
  if(mainMenu) mainMenu.style.display='block';
  populatePackSelect();
}

/* -------------------------
   Original Single-Pack Quiz
------------------------- */
function startSinglePackQuiz(packName){
  const pack=VERSE_PACKS[packName];
  session={pack,remaining:shuffle(pack.slice()),current:null};
  if(packSelectCard) packSelectCard.style.display='none';
  if(reviewCard) reviewCard.style.display='none';
  if(quizCard) quizCard.style.display='block';
  renderNext();
}

function renderNext(){
  if(!session||!session.remaining||session.remaining.length===0){
    alert("You have finished all verses in this pack!");
    backToMain();
    return;
  }
  session.current=session.remaining.pop();
  quizRef.textContent=session.current.ref||'';
  inputTitle.value='';
  inputVerse.value='';
}

function showReview(uTitle,uVerse){
  if(quizCard) quizCard.style.display='none';
  if(reviewCard) reviewCard.style.display='block';
  const c=session && session.current;
  if(!c) return;
  reviewHeading.textContent=c.ref||'';
  correctTitle.textContent=c.title||'';
  correctVerse.textContent=c.verse||'';
  userTitleEl.textContent=uTitle||'—';
  userVerseBox.innerHTML=highlightComparison(c.verse,uVerse);
  userTitleEl.style.color=(uTitle||'').trim().toLowerCase()===(c.title||'').trim().toLowerCase()?"black":"blue";
}

/* -------------------------
   Advanced Multi-Pack Quiz
------------------------- */
function startAdvancedQuiz(selected){
  let pool=[];
  selected.forEach(packName=>{
    pool=pool.concat(VERSE_PACKS[packName]||[]);
  });
  if(!pool.length){alert('No verses in selected packs'); return;}
  pool=shuffle(pool).slice(0,12);
  advSession={verses:pool,index:0,results:[],finished:false};
  if(mainMenu) mainMenu.style.display='none';
  if(reviewCard) reviewCard.style.display='none';
  if(packSelectCard) packSelectCard.style.display='none';
  if(quizCard) quizCard.style.display='block';
  loadAdvancedQuestion();
}

function loadAdvancedQuestion(){
  if(!advSession) return;
  const v=advSession.verses[advSession.index];
  quizRef.textContent=v.ref||'';
  inputTitle.value='';
  inputVerse.value='';
}

function submitAdvancedAnswer(){
  if(!advSession) return;
  const v=advSession.verses[advSession.index];
  const userTitle=(inputTitle.value||'').trim();
  const userVerse=(inputVerse.value||'').trim();
  let score=-Math.min(calculateBodyPenalty(v,userVerse)+((normalizeWord(v.title)!==normalizeWord(userTitle))?1:0),5);
  advSession.results.push({
    ref:v.ref,
    title:v.title,
    verse:v.verse,
    userTitle,
    userVerse,
    score,
    highlighted:highlightComparison(v.verse,userVerse)
  });
  advSession.index++;
  if(advSession.index>=advSession.verses.length){
    advSession.finished=true;
    showAdvancedReviewPage();
  }else loadAdvancedQuestion();
}

function calculateBodyPenalty(v,userVerse){
  const refWords=tokenize(v.verse);
  const userWords=tokenize(userVerse);
  let mistakes=0;
  const len=Math.max(refWords.length,userWords.length);
  for(let i=0;i<len;i++){
    if(normalizeWord(refWords[i]||'')!==normalizeWord(userWords[i]||'')) mistakes++;
  }
  return Math.min(mistakes,4);
}

function showAdvancedReviewPage(){
  if(quizCard) quizCard.style.display='none';
  if(reviewCard) reviewCard.style.display='block';
  reviewHeading.textContent="Advanced Quiz Review";
  let totalScore=0;
  let html='';
  advSession.results.forEach((r,idx)=>{
    totalScore+=r.score;
    html+=`<div class="adv-result-block">
      <h3>${escapeHtml(r.ref||'')} (Verse ${idx+1}, Score: ${r.score})</h3>
      <p><strong>Correct Title:</strong> ${escapeHtml(r.title||'')}</p>
      <p><strong>Your Title:</strong> ${escapeHtml(r.userTitle||'—')}</p>
      <p><strong>Correct Verse:</strong> ${escapeHtml(r.verse||'')}</p>
      <p><strong>Your Verse:</strong></p>
      <p>${r.highlighted}</p>
      <hr>
    </div>`;
  });
  correctTitle.textContent="Total Score: "+totalScore;
  correctVerse.innerHTML=html;
  if(nextBtn) nextBtn.style.display='none';
  if(retryBtn) retryBtn.style.display='none';
  if(skipBtn) skipBtn.style.display='none';
  if(backBtn) backBtn.style.display='block';
}

/* -------------------------
   Button Wiring
------------------------- */
goToPackSelectBtn && (goToPackSelectBtn.onclick=()=>{
  advancedMode=false;
  if(mainMenu) mainMenu.style.display='none';
  if(packSelectCard) packSelectCard.style.display='block';
  if(packSelect) packSelect.multiple=false;
  populatePackSelect();
});

// SMС button
startAdvancedQuizBtn && (startAdvancedQuizBtn.onclick=()=>{
  advancedMode=true;
  if(mainMenu) mainMenu.style.display='none';
  if(packSelectCard) packSelectCard.style.display='block';
  if(packSelect) packSelect.multiple=true;
  populatePackSelect();
});

// Start button
startQuizBtn && (startQuizBtn.onclick=()=>{
  const selected=[...packSelect.selectedOptions].map(o=>o.value);
  if(!selected.length){alert("Please select at least one pack!"); return;}
  if(advancedMode) startAdvancedQuiz(selected);
  else startSinglePackQuiz(selected[0]);
});

submitAnswerBtn && (submitAnswerBtn.onclick=()=>{
  if(advSession && !advSession.finished) submitAdvancedAnswer();
  else if(session && session.current) showReview(inputTitle.value.trim(),inputVerse.value.trim());
  else alert('No active quiz. Pick a pack first.');
});

skipBtn && (skipBtn.onclick=()=>{
  if(advSession && !advSession.finished) submitAdvancedAnswer();
  else showReview("","");
});

nextBtn && (nextBtn.onclick=()=>{
  if(reviewCard) reviewCard.style.display='none';
  if(quizCard) quizCard.style.display='block';
  renderNext();
});

retryBtn && (retryBtn.onclick=()=>{
  if(!session||!session.current) return;
  session.remaining.push(session.current);
  if(reviewCard) reviewCard.style.display='none';
  if(quizCard) quizCard.style.display='block';
  renderNext();
});

backBtn && (backBtn.onclick=()=>{
  if(advSession && advSession.finished){
    advSession=null;
    if(packSelect) packSelect.multiple=false;
    advancedMode=false;
  }
  backToMain();
});

/* -------------------------
   View Packs Page
------------------------- */
viewPacksBtn && (viewPacksBtn.onclick=()=>{
  if(packSelectCard) packSelectCard.style.display='none';
  if(mainMenu) mainMenu.style.display='none';
  if(viewPacksCard) viewPacksCard.style.display='block';
  renderPacks();
});

backToMenuBtn && (backToMenuBtn.onclick=()=>{
  if(viewPacksCard) viewPacksCard.style.display='none';
  if(mainMenu) mainMenu.style.display='block';
});

backToMenuBtn2 && (backToMenuBtn2.onclick=()=>{
  if(viewPacksCard) viewPacksCard.style.display='none';
  if(mainMenu) mainMenu.style.display='block';
});

function renderPacks(){
  if(!packsContainer) return;
  packsContainer.innerHTML='';
  for(const packName in VERSE_PACKS){
    const pc=document.createElement('div');
    pc.className='pack-card';
    pc.innerHTML=`<h3>${escapeHtml(packName)}</h3>`;
    pc.onclick=()=>showPackVerses(packName);
    packsContainer.appendChild(pc);
  }
}

function showPackVerses(packName){
  const pack=VERSE_PACKS[packName];
  if(!packsContainer) return;
  packsContainer.innerHTML='';
  const topBack=document.createElement('button');
  topBack.textContent='← Back to Packs';
  topBack.className='ghost';
  topBack.onclick=renderPacks;
  packsContainer.appendChild(topBack);
  const title=document.createElement('h3');
  title.textContent=packName;
  packsContainer.appendChild(title);
  pack.forEach(v=>{
    const vc=document.createElement('div');
    vc.className='verse-card';
    vc.innerHTML=`<h4>${escapeHtml(v.title||'')}</h4><p><strong>${escapeHtml(v.ref||'')}</strong></p><p>${escapeHtml(v.verse||'')}</p>`;
    packsContainer.appendChild(vc);
  });
  const bottomBack=document.createElement('button');
  bottomBack.textContent='← Back to Packs';
  bottomBack.className='ghost';
  bottomBack.onclick=renderPacks;
  packsContainer.appendChild(bottomBack);
}

/* -------------------------
   Init
------------------------- */
document.addEventListener('DOMContentLoaded',()=>{
  populatePackSelect();
  if(packSelect) packSelect.multiple=false;
});
