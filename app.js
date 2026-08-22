const categoryScreen = document.getElementById('categoryScreen');
const gridScreen = document.getElementById('gridScreen');
const summaryScreen = document.getElementById('summaryScreen');

const categoryList = document.getElementById('categoryList');
const gridTitle = document.getElementById('gridTitle');
const gridSubtitle = document.getElementById('gridSubtitle');
const scorePill = document.getElementById('scorePill');
const grid = document.getElementById('grid');
const backBtn = document.getElementById('backBtn');
const finishBtn = document.getElementById('finishBtn');
const summaryScore = document.getElementById('summaryScore');
const summaryList = document.getElementById('summaryList');
const playAgainBtn = document.getElementById('playAgainBtn');

let currentEntries = [];
let currentCategory = null;
let score = 0;
let answered = 0;

function showScreen(el) {
  [categoryScreen, gridScreen, summaryScreen].forEach((s) => s.classList.add('hidden'));
  el.classList.remove('hidden');
}

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCorrectGuess(entry, guess) {
  const normGuess = normalize(guess);
  if (!normGuess) return false;
  return entry.playerAliases.some((alias) => normalize(alias) === normGuess);
}

function pickTextColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

async function loadCategories() {
  try {
    const res = await fetch('data/categories.json');
    const categories = await res.json();
    renderCategories(categories);
  } catch (err) {
    categoryList.innerHTML = '<p class="error-text">Could not load categories.</p>';
  }
}

function renderCategories(sports) {
  categoryList.innerHTML = '';
  sports.forEach((sport) => {
    const section = document.createElement('div');
    section.className = 'sport-section';

    const heading = document.createElement('h2');
    heading.className = 'sport-heading';
    heading.textContent = sport.sport;
    section.appendChild(heading);

    const cardWrap = document.createElement('div');
    cardWrap.className = 'sport-cards';

    sport.categories.forEach((cat) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'category-card';
      card.innerHTML = `
        <span class="category-icon">${cat.icon || '🏆'}</span>
        <span class="category-copy">
          <h3>${cat.title}</h3>
          <p>${cat.subtitle}</p>
        </span>
      `;
      card.addEventListener('click', () => openCategory(cat));
      cardWrap.appendChild(card);
    });

    section.appendChild(cardWrap);
    categoryList.appendChild(section);
  });
}

async function openCategory(cat) {
  try {
    const res = await fetch(cat.file);
    const entries = await res.json();
    currentCategory = cat;
    currentEntries = entries;
    score = 0;
    answered = 0;
    gridTitle.textContent = cat.title;
    gridSubtitle.textContent = cat.subtitle;
    renderGrid(entries);
    updateScore();
    showScreen(gridScreen);
  } catch (err) {
    console.error(err);
  }
}

function renderGrid(entries) {
  grid.innerHTML = '';
  entries.forEach((entry) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.year = entry.year;

    const yearLabel = document.createElement('div');
    yearLabel.className = 'cell-year';
    yearLabel.textContent = entry.year;
    cell.appendChild(yearLabel);

    const [c1] = entry.colors || ['#374151'];
    cell.style.setProperty('--accent-color', c1);

    const logo = document.createElement('div');
    logo.className = 'cell-logo';
    if (entry.logo) {
      logo.innerHTML = `<img src="${entry.logo}" alt="${entry.school}" loading="lazy" />`;
    } else {
      logo.style.background = `linear-gradient(135deg, ${c1}, ${entry.colors?.[1] || '#e5e7eb'})`;
      logo.style.color = pickTextColor(c1);
      logo.innerHTML = `<div class="cell-logo-abbr">${entry.abbr}</div>`;
    }
    cell.appendChild(logo);

    const statHTML = entry.statLine ? `<div class="cell-stat">${entry.statLine}</div>` : '';

    const guessArea = document.createElement('div');
    guessArea.className = 'cell-guess-area';
    guessArea.innerHTML = `${statHTML}<input class="cell-input" type="text" placeholder="Who?" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />`;
    cell.appendChild(guessArea);

    const revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'cell-reveal-btn';
    revealBtn.textContent = 'reveal';
    revealBtn.addEventListener('click', () => revealCell(cell, entry, false));
    cell.appendChild(revealBtn);

    const input = guessArea.querySelector('.cell-input');
    input.addEventListener('keydown', (e) => {
      const isEnter = e.key === 'Enter' || e.keyCode === 13 || e.which === 13;
      if (!isEnter) return;
      e.preventDefault();
      const guess = input.value;
      if (isCorrectGuess(entry, guess)) {
        revealCell(cell, entry, true);
      } else {
        cell.classList.remove('shake');
        void cell.offsetWidth;
        cell.classList.add('shake');
        input.value = '';
      }
    });

    grid.appendChild(cell);
  });
}

function revealCell(cell, entry, correct) {
  if (cell.classList.contains('correct') || cell.classList.contains('revealed')) return;

  cell.classList.add(correct ? 'correct' : 'revealed');

  const statHTML = entry.statLine ? `<div class="cell-stat">${entry.statLine}</div>` : '';
  const guessArea = cell.querySelector('.cell-guess-area');
  guessArea.innerHTML = `${statHTML}<div class="cell-answer">${entry.player}</div>`;

  const revealBtn = cell.querySelector('.cell-reveal-btn');
  if (revealBtn) revealBtn.remove();

  answered += 1;
  if (correct) score += 1;
  updateScore();

  if (answered === currentEntries.length) {
    setTimeout(showSummary, 400);
  }
}

function updateScore() {
  scorePill.textContent = `${score} / ${currentEntries.length}`;
}

function showSummary() {
  const misses = [];
  document.querySelectorAll('#grid .cell').forEach((cell) => {
    const year = Number(cell.dataset.year);
    const entry = currentEntries.find((e) => e.year === year);
    if (cell.classList.contains('revealed')) misses.push(entry);
  });

  summaryScore.textContent = `${score} / ${currentEntries.length}`;
  summaryList.innerHTML = '';

  if (misses.length === 0) {
    const perfect = document.createElement('p');
    perfect.textContent = 'Perfect score! 🎉';
    summaryList.appendChild(perfect);
  } else {
    misses
      .sort((a, b) => b.year - a.year)
      .forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'summary-row miss';
        row.innerHTML = `<span class="miss-year">${entry.year}</span><span>${entry.player} — ${entry.school}</span>`;
        summaryList.appendChild(row);
      });
  }

  showScreen(summaryScreen);
}

finishBtn.addEventListener('click', () => {
  document.querySelectorAll('#grid .cell').forEach((cell) => {
    if (!cell.classList.contains('correct') && !cell.classList.contains('revealed')) {
      const year = Number(cell.dataset.year);
      const entry = currentEntries.find((e) => e.year === year);
      revealCell(cell, entry, false);
    }
  });
  if (answered < currentEntries.length) {
    showSummary();
  }
});

backBtn.addEventListener('click', () => showScreen(categoryScreen));
playAgainBtn.addEventListener('click', () => showScreen(categoryScreen));

loadCategories();
