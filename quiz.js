/* =========================
   DOM REFERENCES
   ========================= */
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

/* Defensive checks */
if (!packSelect || !quizCard || !reviewCard || !mainMenu) {
  console.error('Required DOM elements missing.');
}

/* =========================
   UTILITIES
   ========================= */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function tokenize(s) { return s ? s.trim().split(/\s+/) : []; }
function normalizeWord(w) { return (w||'').replace(/[\W_]+/g,'').toLowerCase(); }
function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function strike(text) { return (text||'').split('').map(c => c + '\u0336').join(''); }

function lcsIndexPairs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({length: n+1}, () => Array(m+1).fill(0));
  for (let i = n-1; i >= 0; i--) {
    for (let j = m-1; j >= 0; j--) {
      if (normalizeWord(a[i]) === normalizeWord(b[j])) dp[i][j] = 1 + dp[i+1][j+1];
      else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  let i=0, j=0, pairs = [];
  while (i<n && j<m) {
    if (normalizeWord(a[i]) === normalizeWord(b[j])) { pairs.push([i,j]); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) i++;
    else j++;
  }
  return pairs;
}

function highlightComparison(correct, user) {
  const cw = tokenize(correct), uw = tokenize(user);
  const dp = Array(cw.length + 1).fill(null).map(() => Array(uw.length + 1).fill(0));
  for (let i = 0; i <= cw.length; i++) dp[i][0] = i;
  for (let j = 0; j <= uw.length; j++) dp[0][j] = j;
  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= uw.length; j++) {
      const cost = normalizeWord(cw[i-1]) === normalizeWord(uw[j-1]) ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }

  let i = cw.length, j = uw.length, result = [];
  while (i>0 || j>0) {
    if (i>0 && j>0 && normalizeWord(cw[i-1]) === normalizeWord(uw[j-1])) {
      result.unshift(`<span class="word ok">${escapeHtml(uw[j-1])}</span>`); i--; j--;
    } else if (j>0 && (i===0 || dp[i][j-1] <= dp[i-1][j])) {
      result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j-1]))}</span>`); j--;
    } else if (i>0 && (j===0 || dp[i-1][j] < dp[i][j-1])) {
      result.unshift(`<span class="word missing">${escapeHtml(cw[i-1])}</span>`); i--;
    } else { i--; j--; }
  }
  return result.join(' ');
}

/* =========================
   POPULATE PACK SELECT
   ========================= */
function populatePackSelect() {
  if (!packSelect) return;
  packSelect.innerHTML = "";
  for (let packName in VERSE_PACKS) {
    const opt = document.createElement("option");
    opt.value = packName;
    opt.textContent = packName;
    packSelect.appendChild(opt);
  }
}

/* =========================
   ORIGINAL SINGLE-QUIZ SESSION
   ========================= */
let session = null;

function renderNext() {
  if (!session || !session.remaining || session.remaining.length === 0) {
    alert("You have finished all verses in this pack!");
    backToMain();
    return;
  }
  session.current = session.remaining.pop();
  quizRef.textContent = session.current.ref;
  inputTitle.value = "";
  inputVerse.value = "";
}

startQuizBtn && (startQuizBtn.onclick = () => {
  const packName = packSelect.value;
  if (!packName) { alert('Please pick a pack'); return; }
  const pack = VERSE_PACKS[packName];
  session = { pack, remaining: shuffle(pack.slice()), current: null };
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'block';
  renderNext();
});

function showReview(uTitle, uVerse) {
  if (quizCard) quizCard.style.display = 'none';
  if (reviewCard) reviewCard.style.display = 'block';
  const c = session && session.current;
  if (!c) return;
  reviewHeading.textContent = c.ref || '';
  correctTitle.textContent = c.title || '';
  correctVerse.textContent = c.verse || '';
  userTitleEl.textContent = uTitle || "—";
  userVerseBox.innerHTML = highlightComparison(c.verse, uVerse);
  userTitleEl.style.color = ((uTitle||'').trim().toLowerCase() === (c.title||'').trim().toLowerCase()) ? "black" : "blue";
}

/* =========================
   ADVANCED QUIZ STATE
   ========================= */
let advSession = null;

/* =========================
   NAVIGATION / BUTTONS
   ========================= */
goToPackSelectBtn && (goToPackSelectBtn.onclick = () => {
  if (mainMenu) mainMenu.style.display = "none";
  if (packSelectCard) packSelectCard.style.display = "block";
  populatePackSelect();
  packSelect.multiple = false; // normal quiz
});

backToMainBtn && (backToMainBtn.onclick = () => {
  if (packSelectCard) packSelectCard.style.display = "none";
  if (mainMenu) mainMenu.style.display = "block";
});

backBtn && (backBtn.onclick = () => {
  if (advSession && advSession.finished) {
    advSession = null;
    packSelect.multiple = false;
    backToMain();
  } else {
    backToMain();
  }
});

nextBtn && (nextBtn.onclick = () => {
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'block';
  renderNext();
});

retryBtn && (retryBtn.onclick = () => {
  if (!session || !session.current) return;
  session.remaining.push(session.current);
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'block';
  renderNext();
});

skipBtn && (skipBtn.onclick = () => {
  if (advSession && !advSession.finished) submitAdvancedAnswer();
  else showReview("", "");
});

/* =========================
   ADVANCED QUIZ FLOW
   ========================= */
startAdvancedQuizBtn && (startAdvancedQuizBtn.onclick = () => {
  // show pack selection first
  if (mainMenu) mainMenu.style.display = 'none';
  if (packSelectCard) packSelectCard.style.display = 'block';
  packSelect.multiple = true;
});

/* When user clicks Start with multiple packs selected for advanced */
startQuizBtn && (startQuizBtn.onclick = () => {
  const selectedOptions = [...packSelect.selectedOptions].map(o => o.value);
  if (!selectedOptions.length) { alert('Please select at least one pack'); return; }

  // detect if multiple packs => advanced mode
  if (selectedOptions.length > 1 || packSelect.multiple) {
    let pool = [];
    selectedOptions.forEach(p => { pool = pool.concat(VERSE_PACKS[p] || []); });
    pool = shuffle(pool).slice(0, 12);
    advSession = { verses: pool, index: 0, results: [], finished: false };
    if (packSelectCard) packSelectCard.style.display = 'none';
    if (quizCard) quizCard.style.display = 'block';
    loadAdvancedQuestion();
    return;
  }

  // single pack flow
  const packName = selectedOptions[0];
  const pack = VERSE_PACKS[packName];
  session = { pack, remaining: shuffle(pack.slice()), current: null };
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'block';
  renderNext();
});

function loadAdvancedQuestion() {
  if (!advSession) return;
  const v = advSession.verses[advSession.index];
  quizRef.textContent = v.ref || '';
  inputTitle.value = '';
  inputVerse.value = '';
}

function scoreAnswer(refTitle, refText, userTitle, userText) {
  const titlePenalty = (normalizeWord(userTitle || '') === normalizeWord(refTitle || '')) ? 0 : 1;
  const refWords = tokenize(refText || ''), userWords = tokenize(userText || '');
  const pairs = lcsIndexPairs(refWords, userWords);
  const matchedRef = new Set(pairs.map(p => p[0]));
  const matchedUser = new Set(pairs.map(p => p[1]));
  const missing = refWords.filter((w,i)=>!matchedRef.has(i));
  const extras = userWords.filter((w,i)=>!matchedUser.has(i));
  const wrong = Math.min(missing.length, extras.length);
  const remainingMissing = Math.max(0, missing.length - wrong);
  const remainingExtras = Math.max(0, extras.length - wrong);
  const bodyPenalty = Math.min(wrong + remainingMissing + remainingExtras, 4);
  const totalPenalty = Math.min(titlePenalty + bodyPenalty, 5);
  return { titlePenalty, bodyPenalty, totalPenalty, details: { missing, extras, wrong, pairs } };
}

function submitAdvancedAnswer() {
  if (!advSession) return;
  const v = advSession.verses[advSession.index];
  const userTitle = inputTitle.value.trim();
  const userVerse = inputVerse.value.trim();
  const sc = scoreAnswer(v.title, v.verse, userTitle, userVerse);
  advSession.results.push({
    ref: v.ref, title: v.title, verse: v.verse,
    userTitle, userVerse,
    score: -sc.totalPenalty,
    highlighted: highlightComparison(v.verse, userVerse)
  });
  advSession.index++;
  if (advSession.index >= advSession.verses.length) {
    advSession.finished = true;
    showAdvancedReviewPage();
  } else loadAdvancedQuestion();
}

function showAdvancedReviewPage() {
  if (quizCard) quizCard.style.display = 'none';
  if (reviewCard) reviewCard.style.display = 'block';
  reviewHeading.textContent = "Advanced Quiz Review";
  let totalScore = 0;
  let html = '';
  advSession.results.forEach((r, idx)=>{
    totalScore += r.score;
    html += `<div class="adv-result-block">
      <h3>${escapeHtml(r.ref)} (Verse ${idx+1} — Score: ${r.score})</h3>
      <p><strong>Correct Title:</strong> ${escapeHtml(r.title)}</p>
      <p><strong>Your Title:</strong> ${escapeHtml(r.userTitle || '—')}</p>
      <p><strong>Correct Verse:</strong> ${escapeHtml(r.verse)}</p>
      <p><strong>Your Verse:</strong></p>
      <p>${r.highlighted}</p>
      <hr>
    </div>`;
  });
  correctTitle.textContent = "Total Score: " + totalScore;
  correctVerse.innerHTML = html;
  nextBtn.style.display = 'none';
  retryBtn.style.display = 'none';
  skipBtn.style.display = 'none';
  backBtn.style.display = 'block';
}

/* =========================
   SUBMIT BUTTON ROUTING
   ========================= */
submitAnswerBtn && (submitAnswerBtn.onclick = () => {
  if (advSession && !advSession.finished) submitAdvancedAnswer();
  else if (session && session.current) showReview(inputTitle.value.trim(), inputVerse.value.trim());
  else alert('No active quiz. Choose a pack or start Advanced Quiz.');
});

/* =========================
   BACK TO MAIN
   ========================= */
function backToMain() {
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'none';
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (viewPacksCard) viewPacksCard.style.display = 'none';
  if (mainMenu) mainMenu.style.display = 'block';
  populatePackSelect();
}

/* =========================
   VIEW PACKS
   ========================= */
viewPacksBtn && (viewPacksBtn.onclick = () => {
  if (packSelectCard) packSelectCard.style.display = "none";
  if (mainMenu) mainMenu.style.display = "none";
  if (viewPacksCard) viewPacksCard.style.display = "block";
  renderPacks();
});

backToMenuBtn && (backToMenuBtn.onclick = backToMain);
backToMenuBtn2 && (backToMenuBtn2.onclick = backToMain);

function renderPacks() {
  if (!packsContainer) return;
  packsContainer.innerHTML = "";
  for (const packName in VERSE_PACKS) {
    const packCard = document.createElement("div");
    packCard.className = "pack-card";
    packCard.innerHTML = `<h3>${escapeHtml(packName)}</h3>`;
    packCard.onclick = () => showPackVerses(packName);
    packsContainer.appendChild(packCard);
  }
}

function showPackVerses(packName) {
  const pack = VERSE_PACKS[packName];
  if (!packsContainer) return;
  packsContainer.innerHTML = "";
  const topBackBtn = document.createElement("button");
  topBackBtn.textContent = "← Back to Packs";
  topBackBtn.className = "ghost";
  topBackBtn.onclick = renderPacks;
  packsContainer.appendChild(topBackBtn);
  const title = document.createElement("h3");
  title.textContent = packName;
  packsContainer.appendChild(title);
  pack.forEach(v => {
    const vCard = document.createElement("div");
    vCard.className = "verse-card";
    vCard.innerHTML = `<h4>${escapeHtml(v.title)}</h4>
      <p><strong>${escapeHtml(v.ref)}</strong></p>
      <p>${escapeHtml(v.verse)}</p>`;
    packsContainer.appendChild(vCard);
  });
  const bottomBackBtn = document.createElement("button");
  bottomBackBtn.textContent = "← Back to Packs";
  bottomBackBtn.className = "ghost";
  bottomBackBtn.onclick = renderPacks;
  packsContainer.appendChild(bottomBackBtn);
}

/* =========================
   INIT
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  populatePackSelect();
  packSelect.multiple = false;
});
