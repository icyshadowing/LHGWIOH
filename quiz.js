/* ===========================================================
   CLEAN, CORRECTED QUIZ SCRIPT
   Supports:
   - Review Quiz (single pack)
   - SMC Advanced Quiz (multi-pack, negative scoring)
   =========================================================== */

/* ============================
   DOM REFERENCES
   ============================ */
const packSelect = document.getElementById("packSelect");
const packSelectCard = document.getElementById("packSelectCard");
const startQuizBtn = document.getElementById("startQuizBtn");
const startAdvancedQuizBtn = document.getElementById("startAdvancedQuizBtn");
const quizCard = document.getElementById("quizCard");
const quizRef = document.getElementById("quizRef");
const inputTitle = document.getElementById("inputTitle");
const inputVerse = document.getElementById("inputVerse");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const skipBtn = document.getElementById("skipBtn");
const reviewCard = document.getElementById("reviewCard");
const reviewHeading = document.getElementById("reviewHeading");
const correctTitle = document.getElementById("correctTitle");
const correctVerse = document.getElementById("correctVerse");
const userTitleEl = document.getElementById("userTitleEl");
const userVerseBox = document.getElementById("userVerseBox");
const nextBtn = document.getElementById("nextBtn");
const retryBtn = document.getElementById("retryBtn");
const backBtn = document.getElementById("backBtn");
const mainMenu = document.getElementById("mainMenu");
const goToPackSelectBtn = document.getElementById("goToPackSelectBtn");
const backToMainBtn = document.getElementById("backToMainBtn");

const viewPacksBtn = document.getElementById("viewPacksBtn");
const viewPacksCard = document.getElementById("viewPacksCard");
const packsContainer = document.getElementById("packsContainer");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const backToMenuBtn2 = document.getElementById("backToMenuBtn2");

/* ============================
   UTILITIES
   ============================ */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tokenize(s) {
  return s ? s.trim().split(/\s+/) : [];
}

function normalizeWord(w) {
  return (w || "").replace(/[\W_]+/g, "").toLowerCase();
}

function escapeHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function strike(s) {
  return s.split("").map(c => c + "\u0336").join("");
}

/* Highlight using edit distance */
function highlightComparison(correct, user) {
  const c = tokenize(correct);
  const u = tokenize(user);

  const dp = Array(c.length + 1)
    .fill(null)
    .map(() => Array(u.length + 1).fill(0));

  for (let i = 0; i <= c.length; i++) dp[i][0] = i;
  for (let j = 0; j <= u.length; j++) dp[0][j] = j;

  for (let i = 1; i <= c.length; i++) {
    for (let j = 1; j <= u.length; j++) {
      const cost = normalizeWord(c[i - 1]) === normalizeWord(u[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  let i = c.length,
    j = u.length,
    out = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizeWord(c[i - 1]) === normalizeWord(u[j - 1])) {
      out.unshift(`<span class="word ok">${escapeHtml(u[j - 1])}</span>`);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      out.unshift(`<span class="word extra">${strike(escapeHtml(u[j - 1]))}</span>`);
      j--;
    } else {
      out.unshift(`<span class="word missing">${escapeHtml(c[i - 1])}</span>`);
      i--;
    }
  }

  return out.join(" ");
}

/* ============================
   POPULATE PACK SELECT
   ============================ */
function populatePackSelect() {
  packSelect.innerHTML = "";
  for (const packName in VERSE_PACKS) {
    const opt = document.createElement("option");
    opt.value = packName;
    opt.textContent = packName;
    packSelect.appendChild(opt);
  }
}

/* ============================
   ORIGINAL QUIZ MODE
   ============================ */
let session = null;

function renderNext() {
  if (!session.remaining.length) {
    alert("You finished all verses!");
    backToMain();
    return;
  }
  session.current = session.remaining.pop();
  quizRef.textContent = session.current.ref;
  inputTitle.value = "";
  inputVerse.value = "";
}

startQuizBtn.onclick = () => {
  const selected = [...packSelect.selectedOptions].map(o => o.value);
  if (selected.length !== 1) {
    alert("Select ONE pack for Review Quiz.");
    return;
  }

  const pack = VERSE_PACKS[selected[0]];
  session = {
    pack,
    remaining: shuffle(pack.slice()),
    current: null
  };

  mainMenu.style.display = "none";
  packSelectCard.style.display = "none";
  reviewCard.style.display = "none";
  quizCard.style.display = "block";

  renderNext();
};

function showReview(userTitle, userVerse) {
  quizCard.style.display = "none";
  reviewCard.style.display = "block";

  const v = session.current;
  reviewHeading.textContent = v.ref;
  correctTitle.textContent = v.title;
  correctVerse.textContent = v.verse;

  userTitleEl.textContent = userTitle || "—";
  userVerseBox.innerHTML = highlightComparison(v.verse, userVerse);
}

/* ============================
   ADVANCED SMC QUIZ MODE
   ============================ */
let advSession = null;

startAdvancedQuizBtn.onclick = () => {
  const selected = [...packSelect.selectedOptions].map(o => o.value);
  const packs = selected.length ? selected : Object.keys(VERSE_PACKS);

  let pool = [];
  packs.forEach(p => pool.push(...VERSE_PACKS[p]));
  if (!pool.length) return alert("No verses found.");

  pool = shuffle(pool).slice(0, 12);

  advSession = {
    verses: pool,
    index: 0,
    results: [],
    finished: false
  };

  mainMenu.style.display = "none";
  packSelectCard.style.display = "none";
  reviewCard.style.display = "none";
  quizCard.style.display = "block";

  loadAdvQuestion();
};

function loadAdvQuestion() {
  const v = advSession.verses[advSession.index];
  quizRef.textContent = v.ref;
  inputTitle.value = "";
  inputVerse.value = "";
}

/* scoring - max penalty 5 */
function scoreAnswer(refTitle, refText, userTitle, userText) {
  const titlePenalty =
    normalizeWord(refTitle) === normalizeWord(userTitle) ? 0 : 1;

  const refWords = tokenize(refText);
  const userWords = tokenize(userText);

  let missing = 0,
    extras = 0;

  let u = 0;
  for (let r = 0; r < refWords.length; r++) {
    if (u < userWords.length &&
        normalizeWord(refWords[r]) === normalizeWord(userWords[u])) {
      u++;
    } else {
      missing++;
    }
  }

  extras = Math.max(0, userWords.length - u);
  const bodyPenalty = Math.min(missing + extras, 4);

  return Math.min(titlePenalty + bodyPenalty, 5);
}

function submitAdvAnswer() {
  const v = advSession.verses[advSession.index];
  const userTitle = inputTitle.value.trim();
  const userVerse = inputVerse.value.trim();

  const penalty = scoreAnswer(v.title, v.verse, userTitle, userVerse);

  advSession.results.push({
    ref: v.ref,
    title: v.title,
    verse: v.verse,
    userTitle,
    userVerse,
    highlighted: highlightComparison(v.verse, userVerse),
    score: -penalty
  });

  advSession.index++;

  if (advSession.index >= advSession.verses.length) {
    advSession.finished = true;
    showAdvancedReviewPage();
  } else {
    loadAdvQuestion();
  }
}

/* review for SMC */
function showAdvancedReviewPage() {
  quizCard.style.display = "none";
  reviewCard.style.display = "block";

  reviewHeading.textContent = "Advanced Quiz Review";

  let total = 0;
  let html = "";

  advSession.results.forEach((r, i) => {
    total += r.score;
    html += `
      <div class="adv-result-block">
        <h3>${escapeHtml(r.ref)} <small>(Score: ${r.score})</small></h3>
        <p><strong>Correct Title:</strong> ${escapeHtml(r.title)}</p>
        <p><strong>Your Title:</strong> ${escapeHtml(r.userTitle || "—")}</p>
        <p><strong>Correct Verse:</strong><br>${escapeHtml(r.verse)}</p>
        <p><strong>Your Verse:</strong></p>
        <p>${r.highlighted}</p>
        <hr>
      </div>
    `;
  });

  correctTitle.textContent = "Total Score: " + total;
  correctVerse.innerHTML = html;

  nextBtn.style.display = "none";
  retryBtn.style.display = "none";
  skipBtn.style.display = "none";
  backBtn.style.display = "block";
}

/* ============================
   BUTTON HANDLERS
   ============================ */
submitAnswerBtn.onclick = () => {
  if (advSession && !advSession.finished) {
    submitAdvAnswer();
  } else if (session) {
    showReview(inputTitle.value.trim(), inputVerse.value.trim());
  } else {
    alert("Start a quiz first.");
  }
};

skipBtn.onclick = () => {
  if (advSession && !advSession.finished) {
    submitAdvAnswer();
  } else if (session) {
    showReview("", "");
  }
};

nextBtn.onclick = () => {
  reviewCard.style.display = "none";
  quizCard.style.display = "block";
  renderNext();
};

retryBtn.onclick = () => {
  session.remaining.push(session.current);
  reviewCard.style.display = "none";
  quizCard.style.display = "block";
  renderNext();
};

backBtn.onclick = () => {
  advSession = null;
  session = null;
  packSelect.multiple = true;
  backToMain();
};

goToPackSelectBtn.onclick = () => {
  mainMenu.style.display = "none";
  packSelectCard.style.display = "block";
  populatePackSelect();
};

backToMainBtn.onclick = backToMain;

function backToMain() {
  reviewCard.style.display = "none";
  quizCard.style.display = "none";
  packSelectCard.style.display = "none";
  viewPacksCard.style.display = "none";
  mainMenu.style.display = "block";
}

/* VIEW PACKS */
viewPacksBtn.onclick = () => {
  mainMenu.style.display = "none";
  viewPacksCard.style.display = "block";
  renderPacks();
};

backToMenuBtn.onclick = backToMain;
backToMenuBtn2.onclick = backToMain;

function renderPacks() {
  packsContainer.innerHTML = "";
  for (const packName in VERSE_PACKS) {
    const card = document.createElement("div");
    card.className = "pack-card";
    card.innerHTML = `<h3>${packName}</h3>`;
    card.onclick = () => showPackVerses(packName);
    packsContainer.appendChild(card);
  }
}

function showPackVerses(packName) {
  const pack = VERSE_PACKS[packName];
  packsContainer.innerHTML = `<button class="ghost" onclick="renderPacks()">← Back</button>`;
  packsContainer.innerHTML += `<h3>${packName}</h3>`;

  pack.forEach(v => {
    packsContainer.innerHTML += `
      <div class="verse-card">
        <h4>${escapeHtml(v.title)}</h4>
        <strong>${escapeHtml(v.ref)}</strong>
        <p>${escapeHtml(v.verse)}</p>
      </div>
    `;
  });

  packsContainer.innerHTML += `<button class="ghost" onclick="renderPacks()">← Back</button>`;
}

/* INIT */
document.addEventListener("DOMContentLoaded", populatePackSelect);
