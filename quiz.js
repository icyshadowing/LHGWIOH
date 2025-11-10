const packSelect = document.getElementById('packSelect');
const startQuizBtn = document.getElementById('startQuizBtn');
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
const userTitleEl = document.getElementById('userTitle');
const userVerseBox = document.getElementById('userVerseBox');
const nextBtn = document.getElementById('nextBtn');
const retryBtn = document.getElementById('retryBtn');
const backBtn = document.getElementById('backBtn');
const mainMenu = document.getElementById("mainMenu");
const goToPackSelectBtn = document.getElementById("goToPackSelectBtn");
const backToMainBtn = document.getElementById("backToMainBtn");


let session = null;

function populatePackSelect() {
  packSelect.innerHTML = "";
  for (let packName in VERSE_PACKS) {
    const opt = document.createElement("option");
    opt.value = packName;
    opt.textContent = packName;
    packSelect.appendChild(opt);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populatePackSelect();
});

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderNext() {
  if (session.remaining.length === 0) {
    alert("You have finished all verses in this pack!");
    backToMain();
    return;
  }
  session.current = session.remaining.pop();
  quizRef.textContent = session.current.ref;
  inputTitle.value = "";
  inputVerse.value = "";
}

// === Button actions ===
startQuizBtn.onclick = () => {
  const packName = packSelect.value;
  const pack = VERSE_PACKS[packName];
  session = { pack, remaining: shuffle(pack.slice()), current: null };
  document.getElementById('packSelectCard').style.display = 'none';
  reviewCard.style.display = 'none';
  quizCard.style.display = 'block';
  renderNext();
};

submitAnswerBtn.onclick = () => showReview(inputTitle.value.trim(), inputVerse.value.trim());
skipBtn.onclick = () => showReview("", "");

nextBtn.onclick = () => {
  reviewCard.style.display = 'none';
  quizCard.style.display = 'block';
  renderNext();
};

retryBtn.onclick = () => {
  session.remaining.push(session.current);
  reviewCard.style.display = 'none';
  quizCard.style.display = 'block';
  renderNext();
};

backBtn.onclick = backToMain;
goToPackSelectBtn.onclick = () => {
  mainMenu.style.display = "none";
  packSelectCard.style.display = "block";
  populatePackSelect();
};

backToMainBtn.onclick = () => {
  packSelectCard.style.display = "none";
  mainMenu.style.display = "block";
};

function backToMain() {
  reviewCard.style.display = 'none';
  quizCard.style.display = 'none';
  packSelectCard.style.display = 'none';
  viewPacksCard.style.display = 'none';
  mainMenu.style.display = 'block';
  populatePackSelect();
}


const viewPacksBtn = document.getElementById("viewPacksBtn");
const viewPacksCard = document.getElementById("viewPacksCard");
const packsContainer = document.getElementById("packsContainer");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const backToMenuBtn2 = document.getElementById("backToMenuBtn2");



viewPacksBtn.onclick = () => {
  document.getElementById("packSelectCard").style.display = "none";
  mainMenu.style.display = "none";
  viewPacksCard.style.display = "block";
  renderPacks();
};

backToMenuBtn.onclick = () => {
  viewPacksCard.style.display = "none";
  mainMenu.style.display = "block";
};

backToMenuBtn2.onclick = () => {
  viewPacksCard.style.display = "none";
  mainMenu.style.display = "block";
};

function renderPacks() {
  packsContainer.innerHTML = "";
  for (const packName in VERSE_PACKS) {
    const packCard = document.createElement("div");
    packCard.className = "pack-card";
    packCard.innerHTML = `<h3>${packName}</h3>`;
    packCard.onclick = () => showPackVerses(packName);
    packsContainer.appendChild(packCard);
  }
}

function showPackVerses(packName) {
  const pack = VERSE_PACKS[packName];
  packsContainer.innerHTML = `
    <button id="backToPacksBtn">← Back to Packs</button>
    <h3>${packName}</h3>
  `;

  pack.forEach(v => {
    const vCard = document.createElement("div");
    vCard.className = "verse-card";
    vCard.innerHTML = `
      <h4>${v.title}</h4>
      <p><strong>${v.ref}</strong></p>
      <p>${v.verse}</p>
    `;
    packsContainer.appendChild(vCard);
  });

  document.getElementById("backToPacksBtn").onclick = renderPacks;
}

function tokenize(s) { return s ? s.trim().split(/\s+/) : []; }
function normalize(w) { return w.replace(/[\W_]+/g,'').toLowerCase(); }
function strike(text) { return text.split("").map(c => c + "\u0336").join(""); }

function highlightComparison(correct, user) {
  const cw = tokenize(correct);
  const uw = tokenize(user);
  const dp = Array(cw.length + 1).fill(null).map(() => Array(uw.length + 1).fill(0));
  for (let i = 0; i <= cw.length; i++) dp[i][0] = i;
  for (let j = 0; j <= uw.length; j++) dp[0][j] = j;
  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= uw.length; j++) {
      const cost = normalize(cw[i - 1]) === normalize(uw[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  let i = cw.length, j = uw.length, result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalize(cw[i - 1]) === normalize(uw[j - 1])) {
      result.unshift(`<span class="word ok">${uw[j - 1]}</span>`); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      result.unshift(`<span class="word extra">${strike(uw[j - 1])}</span>`); j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1])) {
      result.unshift(`<span class="word missing">${cw[i - 1]}</span>`); i--;
    } else {
      result.unshift(`<span class="word extra">${strike(uw[j - 1])}</span>`);
      result.push(`<span class="word missing">${cw[i - 1]}</span>`); i--; j--;
    }
  }

  return result.join(" ");
}

function showReview(uTitle, uVerse) {
  quizCard.style.display = 'none';
  reviewCard.style.display = 'block';

  const c = session.current;
  reviewHeading.textContent = c.ref;
  correctTitle.textContent = c.title;
  correctVerse.textContent = c.verse;

  userTitleEl.textContent = uTitle || "—";
  userVerseBox.innerHTML = highlightComparison(c.verse, uVerse);

  if (uTitle.trim().toLowerCase() === c.title.trim().toLowerCase()) {
    userTitleEl.style.color = "black";
  } else {
    userTitleEl.style.color = "blue";
  }
}
