const categoryScreen = document.getElementById('categoryScreen');
const gridScreen = document.getElementById('gridScreen');
const summaryScreen = document.getElementById('summaryScreen');

const categoryList = document.getElementById('categoryList');
const gridTitle = document.getElementById('gridTitle');
const gridSubtitle = document.getElementById('gridSubtitle');
const scorePill = document.getElementById('scorePill');
const strikesPill = document.getElementById('strikesPill');
const strikesOptions = document.getElementById('strikesOptions');
const timePill = document.getElementById('timePill');
const grid = document.getElementById('grid');
const backBtn = document.getElementById('backBtn');
const finishBtn = document.getElementById('finishBtn');
const summaryHeading = document.getElementById('summaryHeading');
const summaryScore = document.getElementById('summaryScore');
const summaryStrikes = document.getElementById('summaryStrikes');
const summaryTime = document.getElementById('summaryTime');
const summaryList = document.getElementById('summaryList');
const playAgainBtn = document.getElementById('playAgainBtn');

let currentEntries = [];
let guessableTotal = 0;
let currentCategory = null;
let score = 0;
let answered = 0;
let strikes = 0;
let strikeLimit = 5;
let gameEnded = false;
let startTime = 0;
let elapsedSeconds = 0;
let timerInterval = null;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  elapsedSeconds = 0;
  timePill.textContent = formatTime(0);
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timePill.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function showScreen(el) {
  [categoryScreen, gridScreen, summaryScreen].forEach((s) => s.classList.add('hidden'));
  el.classList.remove('hidden');
}

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics: Jokić -> Jokic, Dončić -> Doncic, etc.
    .toLowerCase()
    .replace(/-/g, ' ') // Gilgeous-Alexander -> "gilgeous alexander" so a space-typed guess still matches
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

function setupStrikesSetting() {
  const buttons = Array.from(strikesOptions.querySelectorAll('.strikes-option'));
  const applySelection = (value) => {
    strikeLimit = value === 'unlimited' ? Infinity : Number(value);
    buttons.forEach((b) => b.classList.toggle('selected', b.dataset.value === value));
  };
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => applySelection(btn.dataset.value));
  });
  applySelection('5');
}

async function loadCategories() {
  try {
    const res = await fetch('data/categories.json', { cache: 'no-store' });
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

    const heading = document.createElement('button');
    heading.type = 'button';
    heading.className = 'sport-heading';
    heading.innerHTML = `
      <span class="sport-heading-text">${sport.sport}</span>
      <span class="sport-heading-count">${sport.categories.length}</span>
      <span class="sport-heading-chevron">&#9662;</span>
    `;
    section.appendChild(heading);

    const cardWrap = document.createElement('div');
    cardWrap.className = 'sport-cards';

    heading.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    section.classList.add('collapsed');

    sport.categories.forEach((cat) => {
      if (cat.types) {
        const card = document.createElement('div');
        card.className = 'category-card category-card-grouped';
        card.innerHTML = `
          <div class="category-card-header">
            <span class="category-icon">${cat.icon || '🏆'}</span>
            <span class="category-copy">
              <h3>${cat.title}</h3>
              <p>${cat.subtitle}</p>
            </span>
          </div>
          <div class="variant-row">
            ${cat.types
              .map((t, i) => `<button type="button" class="variant-option" data-index="${i}">${t.label}</button>`)
              .join('')}
          </div>
          <div class="variant-row variant-row-nested hidden"></div>
        `;
        const typeButtons = card.querySelectorAll('.variant-row:not(.variant-row-nested) .variant-option');
        const nestedRow = card.querySelector('.variant-row-nested');
        typeButtons.forEach((btn, i) => {
          btn.addEventListener('click', () => {
            typeButtons.forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
            const type = cat.types[i];
            nestedRow.classList.remove('hidden');
            nestedRow.innerHTML = type.variants
              .map((v, j) => `<button type="button" class="variant-option" data-index="${j}">${v.label}</button>`)
              .join('');
            nestedRow.querySelectorAll('.variant-option').forEach((vbtn, j) => {
              vbtn.addEventListener('click', () => openCategory(type.variants[j]));
            });
          });
        });
        cardWrap.appendChild(card);
      } else if (cat.variants) {
        const card = document.createElement('div');
        card.className = 'category-card category-card-grouped';
        card.innerHTML = `
          <div class="category-card-header">
            <span class="category-icon">${cat.icon || '🏆'}</span>
            <span class="category-copy">
              <h3>${cat.title}</h3>
              <p>${cat.subtitle}</p>
            </span>
          </div>
          <div class="variant-row">
            ${cat.variants
              .map((v, i) => `<button type="button" class="variant-option" data-index="${i}">${v.label}</button>`)
              .join('')}
          </div>
        `;
        const buttons = card.querySelectorAll('.variant-option');
        buttons.forEach((btn, i) => {
          btn.addEventListener('click', () => openCategory(cat.variants[i]));
        });
        cardWrap.appendChild(card);
      } else {
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
      }
    });

    section.appendChild(cardWrap);
    categoryList.appendChild(section);
  });
}

async function openCategory(cat) {
  try {
    const res = await fetch(cat.file, { cache: 'no-store' });
    const entries = await res.json();
    currentCategory = cat;
    currentEntries = entries;
    guessableTotal = entries.filter((e) => !e.invalid).length;
    score = 0;
    answered = 0;
    strikes = 0;
    gameEnded = false;
    gridTitle.textContent = cat.title;
    gridSubtitle.textContent = cat.subtitle;
    renderGrid(entries);
    updateScore();
    updateStrikes();
    startTimer();
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

    if (entry.invalid) {
      cell.classList.add('cell-invalid');
      cell.innerHTML += `<div class="cell-invalid-content"><div class="cell-invalid-mark">N/A</div><div class="cell-invalid-reason">${entry.reason}</div></div>`;
      grid.appendChild(cell);
      return;
    }

    const logo = document.createElement('div');
    logo.className = 'cell-logo';

    if (currentCategory?.noLogoHint) {
      // The entry's own team/logo IS the answer here — showing it would give it away.
      cell.style.setProperty('--accent-color', 'var(--border)');
    } else if (entry.definition) {
      // Pure-text hint (e.g. Word of the Year): show the definition, guess the word.
      cell.style.setProperty('--accent-color', '#8b6f47');
      logo.classList.add('cell-logo-def-wrap');
      const defSize = entry.definition.length > 120 ? '0.6rem' : entry.definition.length > 85 ? '0.66rem' : entry.definition.length > 55 ? '0.76rem' : '0.85rem';
      logo.innerHTML = `<div class="cell-logo-def" style="font-size: ${defSize}">${entry.definition}</div>`;
    } else if (entry.teams) {
      // Rare tie case: show every team's logo side by side.
      logo.classList.add('cell-logo-dual');
      cell.style.setProperty('--accent-color', (entry.teams[0].colors || ['#374151'])[0]);
      logo.innerHTML = entry.teams
        .map((t) => `<div class="cell-logo-half"><img src="${t.logo}" alt="${t.team}" loading="lazy" /></div>`)
        .join('');
    } else {
      // For team-guessing categories (e.g. championship winner/loser), the hint
      // is the OPPONENT's logo — you guess your own team from who you beat/lost to.
      const hint = entry.opponent || entry;
      const [hc1, hc2] = hint.colors || ['#374151', '#e5e7eb'];
      cell.style.setProperty('--accent-color', hc1);
      if (hint.logo) {
        logo.innerHTML = `<img src="${hint.logo}" alt="${hint.team || hint.school || ''}" loading="lazy" />`;
      } else {
        logo.style.background = `linear-gradient(135deg, ${hc1}, ${hc2})`;
        logo.style.color = pickTextColor(hc1);
        logo.classList.add('cell-logo-abbr-wrap');
        const abbrSize = hint.abbr.length > 24 ? '0.72rem' : hint.abbr.length > 10 ? '0.9rem' : '1.15rem';
        logo.innerHTML = `<div class="cell-logo-abbr" style="font-size: ${abbrSize}">${hint.abbr}</div>`;
      }
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
    revealBtn.addEventListener('click', () => {
      registerStrike();
      revealCell(cell, entry, false);
    });
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
        registerStrike();
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

  if (answered === guessableTotal) {
    setTimeout(() => endGame('complete'), 400);
  }
}

function updateScore() {
  scorePill.textContent = `${score} / ${guessableTotal}`;
}

function updateStrikes() {
  const limitText = Number.isFinite(strikeLimit) ? ` / ${strikeLimit}` : '';
  strikesPill.textContent = `${strikes}${limitText} strikes`;
  strikesPill.classList.toggle('maxed', Number.isFinite(strikeLimit) && strikes >= strikeLimit);
}

function registerStrike() {
  if (gameEnded) return;
  strikes += 1;
  updateStrikes();
  if (strikes >= strikeLimit) {
    setTimeout(() => endGame('strikeout'), 400);
  }
}

function endGame(reason) {
  if (gameEnded) return;
  gameEnded = true;
  stopTimer();

  document.querySelectorAll('#grid .cell').forEach((cell) => {
    if (
      !cell.classList.contains('correct') &&
      !cell.classList.contains('revealed') &&
      !cell.classList.contains('cell-invalid')
    ) {
      const year = Number(cell.dataset.year);
      const entry = currentEntries.find((e) => e.year === year);
      revealCell(cell, entry, false);
    }
  });

  showSummary(reason);
}

function showSummary(reason) {
  const misses = [];
  document.querySelectorAll('#grid .cell').forEach((cell) => {
    const year = Number(cell.dataset.year);
    const entry = currentEntries.find((e) => e.year === year);
    if (cell.classList.contains('revealed')) misses.push(entry);
  });

  summaryHeading.textContent = reason === 'strikeout' ? 'Game over — too many strikes' : 'Final score';
  summaryScore.textContent = `${score} / ${guessableTotal}`;
  summaryStrikes.textContent = `${strikes} strike${strikes === 1 ? '' : 's'}${Number.isFinite(strikeLimit) ? ` (limit ${strikeLimit})` : ''}`;
  summaryTime.textContent = `Completed in ${formatTime(elapsedSeconds)}`;
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
        const detail = entry.school ? `${entry.player} — ${entry.school}` : entry.player;
        row.innerHTML = `<span class="miss-year">${entry.year}</span><span>${detail}</span>`;
        summaryList.appendChild(row);
      });
  }

  showScreen(summaryScreen);
}

finishBtn.addEventListener('click', () => endGame('complete'));

backBtn.addEventListener('click', () => {
  stopTimer();
  showScreen(categoryScreen);
});
playAgainBtn.addEventListener('click', () => showScreen(categoryScreen));

setupStrikesSetting();
loadCategories();
