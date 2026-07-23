const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const DAS = 145;
const ARR = 42;
const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;
const LEVEL_TRANSITION_MS = 1400;
const LEVEL_LINE_POINTS = [0, 100, 300, 500, 800];
const CLASSIC_LINE_POINTS = [0, 100, 300, 500, 800];
const T_SPIN_POINTS = [400, 800, 1200, 1600];
const PERFECT_CLEAR_POINTS = [0, 800, 1200, 1800, 3500];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const levelProgressEl = document.getElementById('levelProgress');
const progressBar = document.getElementById('progressBar');
const progressTrack = document.getElementById('progressTrack');
const goalRow = document.getElementById('goalRow');
const speedEl = document.getElementById('speed');
const comboEl = document.getElementById('combo');
const backToBackEl = document.getElementById('backToBack');
const holdCard = document.getElementById('holdCard');
const modeLabel = document.getElementById('modeLabel');
const modeButton = document.getElementById('modeButton');
const overlay = document.getElementById('overlay');
const overlayEyebrow = document.getElementById('overlayEyebrow');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const modeChoices = document.getElementById('modeChoices');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const modeChoiceButtons = [...document.querySelectorAll('[data-mode]')];

const COLORS = {
  I: '#39d9ff', J: '#5167ff', L: '#ff9f43', O: '#ffe34d',
  S: '#52e36c', T: '#b65cff', Z: '#ff5573', G: '#6b7280'
};

const LEVEL_BACKGROUNDS = ['#050816', '#071224', '#120a26', '#071b1b', '#201208', '#17091b'];

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
};

const JLSTZ_KICKS = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};

const I_KICKS = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
};

function pattern(...rows) {
  const emptyRows = Array(Math.max(0, ROWS - rows.length)).fill('..........');
  return [...emptyRows, ...rows];
}

const LEVEL_POOLS = {
  easy: [
    pattern('###....###','####..####'),
    pattern('....##....','...####...','..######..'),
    pattern('#........#','##......##','###....###'),
    pattern('##......##','####..####','####..####'),
    pattern('.....#....','...###....','.#####....'),
    pattern('....#.....','...###....','..#####...')
  ],
  normal: [
    pattern('##......##','##......##','####..####','####..####'),
    pattern('...####...','..........','##......##','####..####','##########'),
    pattern('#........#','##......##','###....###','####..####','#####.####'),
    pattern('....##....','...####...','..........','##......##','####..####','##########'),
    pattern('##..##..##','..........','###....###','####..####','####..####','##########'),
    pattern('...#..#...','..##..##..','..........','###....###','####..####','##########')
  ],
  hard: [
    pattern('..######..','..#....#..','..#....#..','..........','###....###','####..####','##########'),
    pattern('...####...','...#..#...','...####...','..........','#........#','###....###','#####.####','##########'),
    pattern('....##....','...####...','..######..','..........','##......##','####..####','#####.####','##########'),
    pattern('..##..##..','..##..##..','..........','####..####','#........#','####..####','##########'),
    pattern('...#..#...','..##..##..','.###..###.','..........','##......##','####..####','#####.####','##########'),
    pattern('..######..','..#....#..','..#.##.#..','..#....#..','..######..','..........','####..####','##########')
  ],
  expert: [
    pattern('....##....','...####...','..##..##..','..........','##......##','##.####.##','..........','####..####','#####.####','##########'),
    pattern('...####...','...#..#...','...#..#...','...####...','..........','#..####..#','##......##','####..####','##########'),
    pattern('..##..##..','..##..##..','..........','####..####','#........#','#.######.#','..........','#####.####','##########'),
    pattern('...####...','..##..##..','.##....##.','..........','##.####.##','##......##','####..####','##########'),
    pattern('....##....','...####...','..######..','...####...','....##....','..........','#####.####','##########'),
    pattern('..######..','..#....#..','..#.##.#..','..#....#..','..######..','..........','##.####.##','##########')
  ],
  master: [
    pattern('...####...','..##..##..','.##.##.##.','..........','##.####.##','##......##','###.##.###','..........','#####.####','##########'),
    pattern('..######..','..#....#..','..#.##.#..','..#....#..','..######..','..........','###....###','#.######.#','#####.####','##########'),
    pattern('....##....','...####...','..######..','.########.','..######..','...####...','....##....','..........','#####.####','##########'),
    pattern('##......##','.##....##.','..##..##..','...####...','....##....','...####...','..##..##..','..........','#####.####','##########'),
    pattern('..##..##..','..######..','..##..##..','..........','####..####','#..####..#','#........#','####..####','#####.####','##########'),
    pattern('...####...','..##..##..','.##....##.','##..##..##','..........','###.##.###','#........#','#.######.#','#####.####','##########')
  ]
};

let gameMode = null;
let board = createBoard();
let current = null;
let bag = [];
let nextQueue = [];
let holdType = null;
let holdUsed = false;
let score = 0;
let highscore = 0;
let level = 1;
let linesThisLevel = 0;
let totalLines = 0;
let requiredLines = 8;
let dropInterval = 950;
let running = false;
let paused = false;
let transitioning = false;
let transitionElapsed = 0;
let lastTime = 0;
let animationId = null;
let fallProgress = 0;
let lockTimer = 0;
let lockResets = 0;
let softDropHeld = false;
let lastLayoutKey = '';
let scorePopupText = '';
let scorePopupTimer = 0;
let combo = -1;
let backToBack = false;
let lastAction = '';

const input = {
  left: false,
  right: false,
  horizontalDirection: 0,
  horizontalHeldFor: 0,
  repeatAccumulator: 0
};

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getBagPiece() {
  if (!bag.length) bag = shuffle(Object.keys(SHAPES));
  return bag.pop();
}

function ensureQueue(length = 6) {
  while (nextQueue.length < length) nextQueue.push(getBagPiece());
}

function topPadding(matrix) {
  let amount = 0;
  for (const row of matrix) {
    if (row.some(Boolean)) break;
    amount++;
  }
  return amount;
}

function createPiece(type) {
  const matrix = SHAPES[type].map(row => [...row]);
  const x = Math.floor((COLS - matrix[0].length) / 2);
  return {
    type,
    matrix,
    rotation: 0,
    x,
    y: -topPadding(matrix),
    renderX: x
  };
}

function resetLockState() {
  lockTimer = 0;
  lockResets = 0;
}

function resetInput() {
  input.left = false;
  input.right = false;
  input.horizontalDirection = 0;
  input.horizontalHeldFor = 0;
  input.repeatAccumulator = 0;
  softDropHeld = false;
}

function spawnPiece({ resetHold = true, forcedType = null } = {}) {
  ensureQueue(6);
  const type = forcedType || nextQueue.shift();
  ensureQueue(6);
  current = createPiece(type);
  fallProgress = 0;
  lastAction = 'spawn';
  resetLockState();
  if (resetHold) holdUsed = false;
  drawPreviews();
  if (collides(current.matrix, current.x, current.y)) gameOver();
}

function collides(matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const px = offsetX + x;
      const py = offsetY + y;
      if (px < 0 || px >= COLS || py >= ROWS) return true;
      if (py >= 0 && board[py][px]) return true;
    }
  }
  return false;
}

function isGrounded() {
  return current && collides(current.matrix, current.x, current.y + 1);
}

function refreshLockDelay() {
  if (!current) return;
  if (!isGrounded()) {
    lockTimer = 0;
    lockResets = 0;
  } else if (lockResets < MAX_LOCK_RESETS) {
    lockTimer = 0;
    lockResets++;
  }
}

function rotateMatrixClockwise(matrix) {
  return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
}

function rotateMatrixCounterClockwise(matrix) {
  return matrix[0].map((_, index) => matrix.map(row => row[matrix.length - 1 - index]));
}

function rotatePiece(direction = 1) {
  if (!running || paused || transitioning || !current) return;
  if (current.type === 'O') {
    lastAction = 'rotate';
    refreshLockDelay();
    return;
  }

  const from = current.rotation;
  const to = (from + (direction > 0 ? 1 : 3)) % 4;
  const rotated = direction > 0
    ? rotateMatrixClockwise(current.matrix)
    : rotateMatrixCounterClockwise(current.matrix);
  const kickTable = current.type === 'I' ? I_KICKS : JLSTZ_KICKS;
  const kicks = kickTable[`${from}>${to}`] || [[0, 0]];

  for (const [kickX, kickY] of kicks) {
    if (!collides(rotated, current.x + kickX, current.y + kickY)) {
      current.matrix = rotated;
      current.rotation = to;
      current.x += kickX;
      current.y += kickY;
      current.renderX = current.x;
      lastAction = 'rotate';
      refreshLockDelay();
      return;
    }
  }
}

function movePiece(direction) {
  if (!running || paused || transitioning || !current) return false;
  const target = current.x + direction;
  if (collides(current.matrix, target, current.y)) return false;
  current.x = target;
  lastAction = 'move';
  refreshLockDelay();
  return true;
}

function hardDrop() {
  if (!running || paused || transitioning || !current) return;
  let distance = 0;
  while (!collides(current.matrix, current.x, current.y + 1)) {
    current.y++;
    distance++;
  }
  if (gameMode === 'classic') addScore(distance * 2);
  lastAction = 'hard-drop';
  fallProgress = 0;
  lockPiece();
}

function holdPiece() {
  if (gameMode !== 'classic' || !running || paused || transitioning || !current || holdUsed) return;
  const outgoingType = current.type;
  const incomingType = holdType;
  holdType = outgoingType;
  holdUsed = true;
  current = null;
  if (incomingType) spawnPiece({ resetHold: false, forcedType: incomingType });
  else spawnPiece({ resetHold: false });
  drawPreviews();
}

function mergePiece() {
  let aboveTop = false;
  current.matrix.forEach((row, y) => row.forEach((value, x) => {
    if (!value) return;
    const py = current.y + y;
    if (py < 0) aboveTop = true;
    else board[py][current.x + x] = current.type;
  }));
  return aboveTop;
}

function isOccupiedOrOutside(x, y) {
  return x < 0 || x >= COLS || y < 0 || y >= ROWS || Boolean(board[y][x]);
}

function isTSpin(piece) {
  if (!piece || piece.type !== 'T' || lastAction !== 'rotate') return false;
  const pivotX = piece.x + 1;
  const pivotY = piece.y + 1;
  const occupiedCorners = [
    [pivotX - 1, pivotY - 1],
    [pivotX + 1, pivotY - 1],
    [pivotX - 1, pivotY + 1],
    [pivotX + 1, pivotY + 1]
  ].filter(([x, y]) => isOccupiedOrOutside(x, y)).length;
  return occupiedCorners >= 3;
}

function removeFullLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      y++;
    }
  }
  return cleared;
}

function isPerfectClear() {
  return board.every(row => row.every(cell => !cell));
}

function scoreClassicClear(cleared, tSpin) {
  const difficultClear = cleared === 4 || (tSpin && cleared > 0);
  let basePoints = tSpin
    ? (T_SPIN_POINTS[Math.min(cleared, 3)] || 0)
    : CLASSIC_LINE_POINTS[cleared];
  let label = '';

  if (tSpin) label = cleared ? `T-SPIN ${cleared}` : 'T-SPIN';
  else if (cleared === 4) label = 'TETRIS';
  else if (cleared > 0) label = `${cleared} ${cleared === 1 ? 'REIHE' : 'REIHEN'}`;

  if (difficultClear && backToBack) {
    basePoints = Math.round(basePoints * 1.5);
    label += ' · B2B';
  }

  if (cleared > 0) combo++;
  else combo = -1;

  const comboBonus = combo > 0 ? 50 * combo * level : 0;
  let perfectClearBonus = 0;
  if (cleared > 0 && isPerfectClear()) {
    perfectClearBonus = PERFECT_CLEAR_POINTS[cleared] * level;
    label += ' · PERFECT CLEAR';
  }

  const earned = basePoints * level + comboBonus + perfectClearBonus;
  if (earned > 0) {
    addScore(earned);
    scorePopupText = `${label}  +${earned.toLocaleString('de-DE')}`;
    scorePopupTimer = 1200;
  }

  if (cleared > 0) {
    if (difficultClear) backToBack = true;
    else backToBack = false;
    totalLines += cleared;
    level = Math.floor(totalLines / 10) + 1;
    dropInterval = getClassicDropInterval(level);
  }
}

function scoreLevelClear(cleared) {
  if (!cleared) return;
  const earned = LEVEL_LINE_POINTS[cleared] * level;
  addScore(earned);
  scorePopupText = `${cleared} ${cleared === 1 ? 'REIHE' : 'REIHEN'}  +${earned.toLocaleString('de-DE')}`;
  scorePopupTimer = 950;
  linesThisLevel += cleared;
  totalLines += cleared;
  if (linesThisLevel >= requiredLines) beginLevelTransition();
}

function lockPiece() {
  if (!current || transitioning) return;
  const lockedPiece = current;
  const aboveTop = mergePiece();
  const tSpin = gameMode === 'classic' && isTSpin(lockedPiece);
  current = null;
  resetLockState();

  if (aboveTop) {
    gameOver();
    return;
  }

  const cleared = removeFullLines();
  if (gameMode === 'classic') scoreClassicClear(cleared, tSpin);
  else scoreLevelClear(cleared);

  updateUI();
  if (!transitioning && running) spawnPiece();
}

function beginLevelTransition() {
  transitioning = true;
  transitionElapsed = 0;
  current = null;
  board = createBoard();
  resetLockState();
  resetInput();
}

function difficultyForLevel(currentLevel) {
  if (currentLevel <= 3) return 'easy';
  if (currentLevel <= 7) return 'normal';
  if (currentLevel <= 12) return 'hard';
  if (currentLevel <= 18) return 'expert';
  return 'master';
}

function boardFromPattern(selectedPattern) {
  return selectedPattern.map(row => [...row].map(cell => cell === '#' ? 'G' : null));
}

function chooseLayout(currentLevel) {
  if (currentLevel <= 1) return createBoard();
  const difficulty = difficultyForLevel(currentLevel);
  const pool = LEVEL_POOLS[difficulty];
  let index = Math.floor(Math.random() * pool.length);
  let key = `${difficulty}-${index}`;
  if (pool.length > 1 && key === lastLayoutKey) {
    index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    key = `${difficulty}-${index}`;
  }
  lastLayoutKey = key;
  const selectedPattern = Math.random() < 0.5
    ? pool[index]
    : pool[index].map(row => [...row].reverse().join(''));
  return boardFromPattern(selectedPattern);
}

function finishLevelTransition() {
  level++;
  linesThisLevel = 0;
  requiredLines = 8 + (level - 1) * 2;
  dropInterval = getLevelDropInterval(level);
  board = chooseLayout(level);
  bag = [];
  nextQueue = [];
  ensureQueue(6);
  transitioning = false;
  transitionElapsed = 0;
  spawnPiece();
  updateUI();
}

function getLevelDropInterval(currentLevel) {
  return Math.max(75, Math.round(950 * Math.pow(0.86, currentLevel - 1)));
}

function getClassicDropInterval(currentLevel) {
  const base = Math.max(0.1, 0.8 - (currentLevel - 1) * 0.007);
  return Math.max(45, Math.round(1000 * Math.pow(base, currentLevel - 1)));
}

function getHighscoreKey() {
  return gameMode === 'classic' ? 'neonTetrisClassicHighscore' : 'neonTetrisLevelHighscore';
}

function loadHighscore() {
  highscore = Number(localStorage.getItem(getHighscoreKey()) || 0);
}

function addScore(points) {
  score += points;
  if (score > highscore) {
    highscore = score;
    localStorage.setItem(getHighscoreKey(), String(highscore));
  }
  updateUI();
}

function updateModeUI() {
  const classic = gameMode === 'classic';
  modeLabel.textContent = classic ? 'KLASSISCHES TETRIS' : gameMode === 'levels' ? 'LEVELMODUS' : 'MODUS WÄHLEN';
  goalRow.classList.toggle('hidden', classic);
  progressTrack.classList.toggle('hidden', classic);
  holdCard.classList.toggle('hidden', !classic);
  comboEl.closest('.stat-row').classList.toggle('hidden', !classic);
  backToBackEl.closest('.stat-row').classList.toggle('hidden', !classic);
}

function updateUI() {
  scoreEl.textContent = score.toLocaleString('de-DE');
  highscoreEl.textContent = highscore.toLocaleString('de-DE');
  levelEl.textContent = level;
  linesEl.textContent = gameMode === 'classic' ? totalLines : linesThisLevel;
  levelProgressEl.textContent = `${Math.min(linesThisLevel, requiredLines)} / ${requiredLines}`;
  progressBar.style.width = `${Math.min(100, linesThisLevel / requiredLines * 100)}%`;
  speedEl.textContent = `${(950 / dropInterval).toFixed(1)}x`;
  comboEl.textContent = combo > 0 ? `x${combo + 1}` : '–';
  backToBackEl.textContent = backToBack ? 'Aktiv' : '–';
  updateModeUI();
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === 'function') context.roundRect(x, y, width, height, radius);
  else context.rect(x, y, width, height);
}

function adjustColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawCell(context, x, y, color, size = BLOCK, alpha = 1) {
  const px = x * size;
  const py = y * size;
  const gap = Math.max(1.5, size * 0.055);
  const bx = px + gap;
  const by = py + gap;
  const bs = size - gap * 2;
  const radius = Math.max(4, size * 0.18);

  context.save();
  context.globalAlpha = alpha;
  context.shadowColor = color;
  context.shadowBlur = size * 0.2;
  const outer = context.createLinearGradient(bx, by, bx + bs, by + bs);
  outer.addColorStop(0, adjustColor(color, 42));
  outer.addColorStop(0.45, color);
  outer.addColorStop(1, adjustColor(color, -35));
  context.fillStyle = outer;
  roundedRect(context, bx, by, bs, bs, radius);
  context.fill();
  context.shadowBlur = 0;

  const inner = context.createLinearGradient(bx, by, bx, by + bs);
  inner.addColorStop(0, 'rgba(255,255,255,.45)');
  inner.addColorStop(0.28, 'rgba(255,255,255,.08)');
  inner.addColorStop(1, 'rgba(0,0,0,.24)');
  context.fillStyle = inner;
  roundedRect(context, bx + 2.2, by + 2.2, bs - 4.4, bs - 4.4, Math.max(3, radius - 2));
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.34)';
  context.lineWidth = 1.1;
  roundedRect(context, bx + 1, by + 1, bs - 2, bs - 2, Math.max(3, radius - 1));
  context.stroke();
  context.restore();
}

function drawGhostCell(x, y, color) {
  const gap = 4;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundedRect(ctx, x * BLOCK + gap, y * BLOCK + gap, BLOCK - gap * 2, BLOCK - gap * 2, 5);
  ctx.stroke();
  ctx.restore();
}

function getBoardColor() {
  if (gameMode === 'classic') return '#050816';
  if (!transitioning) return LEVEL_BACKGROUNDS[(level - 1) % LEVEL_BACKGROUNDS.length];
  const pulse = Math.sin((transitionElapsed / LEVEL_TRANSITION_MS) * Math.PI);
  return pulse > 0.5 ? '#1b4d5c' : '#28114c';
}

function drawGrid() {
  ctx.fillStyle = getBoardColor();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, canvas.height);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(canvas.width, y * BLOCK);
    ctx.stroke();
  }
}

function drawBoard() {
  board.forEach((row, y) => row.forEach((type, x) => {
    if (type) drawCell(ctx, x, y, COLORS[type]);
  }));
}

function getGhostY(piece) {
  let ghostY = piece.y;
  while (!collides(piece.matrix, piece.x, ghostY + 1)) ghostY++;
  return ghostY;
}

function drawGhost(piece) {
  if (gameMode !== 'classic') return;
  const ghostY = getGhostY(piece);
  if (ghostY === piece.y) return;
  piece.matrix.forEach((row, y) => row.forEach((value, x) => {
    const py = ghostY + y;
    if (value && py >= 0) drawGhostCell(piece.x + x, py, COLORS[piece.type]);
  }));
}

function drawPiece(piece) {
  const renderY = piece.y + fallProgress;
  piece.matrix.forEach((row, y) => row.forEach((value, x) => {
    const py = renderY + y;
    if (value && py > -1.2) drawCell(ctx, piece.renderX + x, py, COLORS[piece.type]);
  }));
}

function drawScorePopup() {
  if (scorePopupTimer <= 0 || !scorePopupText) return;
  const maxDuration = gameMode === 'classic' ? 1200 : 950;
  const progress = 1 - scorePopupTimer / maxDuration;
  ctx.save();
  ctx.globalAlpha = Math.min(1, scorePopupTimer / 220);
  ctx.textAlign = 'center';
  ctx.font = '800 19px system-ui';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#39d9ff';
  ctx.shadowBlur = 14;
  ctx.fillText(scorePopupText, canvas.width / 2, canvas.height * 0.43 - progress * 22);
  ctx.restore();
}

function drawTransition() {
  const progress = Math.min(1, transitionElapsed / LEVEL_TRANSITION_MS);
  const alpha = Math.sin(progress * Math.PI);
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.16})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.textAlign = 'center';
  ctx.font = '700 30px system-ui';
  ctx.fillText(`LEVEL ${level} GESCHAFFT`, canvas.width / 2, canvas.height / 2 - 8);
  ctx.font = '600 16px system-ui';
  ctx.fillText(`LEVEL ${level + 1}`, canvas.width / 2, canvas.height / 2 + 24);
  ctx.restore();
}

function getPieceBounds(matrix) {
  let minX = matrix[0].length;
  let maxX = 0;
  let minY = matrix.length;
  let maxY = 0;
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (!value) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }));
  return { minX, maxX, minY, maxY };
}

function drawMiniPiece(context, type, areaX, areaY, areaWidth, areaHeight, size) {
  if (!type) return;
  const matrix = SHAPES[type];
  const { minX, maxX, minY, maxY } = getPieceBounds(matrix);
  const width = (maxX - minX + 1) * size;
  const height = (maxY - minY + 1) * size;
  const offsetX = areaX + (areaWidth - width) / 2 - minX * size;
  const offsetY = areaY + (areaHeight - height) / 2 - minY * size;
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) drawCell(context, x + offsetX / size, y + offsetY / size, COLORS[type], size);
  }));
}

function drawPreviews() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  ensureQueue(6);

  if (gameMode === 'classic') {
    const count = 5;
    const slotHeight = nextCanvas.height / count;
    for (let index = 0; index < count; index++) {
      drawMiniPiece(nextCtx, nextQueue[index], 0, index * slotHeight, nextCanvas.width, slotHeight, 18);
    }
    drawMiniPiece(holdCtx, holdType, 0, 0, holdCanvas.width, holdCanvas.height, 22);
  } else {
    drawMiniPiece(nextCtx, nextQueue[0], 0, 0, nextCanvas.width, nextCanvas.height, 24);
  }
}

function draw() {
  drawGrid();
  drawBoard();
  if (current && !transitioning) {
    drawGhost(current);
    drawPiece(current);
  }
  drawScorePopup();
  if (transitioning) drawTransition();
}

function updateHorizontalInput(delta) {
  const direction = input.left === input.right ? 0 : input.left ? -1 : 1;
  if (direction !== input.horizontalDirection) {
    input.horizontalDirection = direction;
    input.horizontalHeldFor = 0;
    input.repeatAccumulator = 0;
    if (direction) movePiece(direction);
    return;
  }
  if (!direction) return;
  input.horizontalHeldFor += delta;
  if (input.horizontalHeldFor < DAS) return;
  input.repeatAccumulator += delta;
  while (input.repeatAccumulator >= ARR) {
    movePiece(direction);
    input.repeatAccumulator -= ARR;
  }
}

function updateFall(delta) {
  if (!current) return;
  const effectiveInterval = softDropHeld ? Math.max(25, dropInterval / 18) : dropInterval;
  current.renderX += (current.x - current.renderX) * Math.min(1, delta / 48);

  if (isGrounded()) {
    fallProgress = 0;
    lockTimer += delta;
    if (lockTimer >= LOCK_DELAY) lockPiece();
    return;
  }

  lockTimer = 0;
  lockResets = 0;
  fallProgress += delta / effectiveInterval;

  while (fallProgress >= 1 && current) {
    if (collides(current.matrix, current.x, current.y + 1)) {
      fallProgress = 0;
      break;
    }
    current.y++;
    fallProgress -= 1;
    if (softDropHeld && gameMode === 'classic') addScore(1);
    lastAction = softDropHeld ? 'soft-drop' : 'fall';
  }
}

function gameLoop(time = 0) {
  if (!running) return;
  const delta = Math.min(50, time - lastTime || 0);
  lastTime = time;
  if (!paused) {
    if (scorePopupTimer > 0) scorePopupTimer = Math.max(0, scorePopupTimer - delta);
    if (transitioning) {
      transitionElapsed += delta;
      if (transitionElapsed >= LEVEL_TRANSITION_MS) finishLevelTransition();
    } else {
      updateHorizontalInput(delta);
      updateFall(delta);
    }
    draw();
  }
  animationId = requestAnimationFrame(gameLoop);
}

function prepareOverlay({ eyebrow, title, text, buttonText = '', showModes = false }) {
  overlayEyebrow.textContent = eyebrow;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  modeChoices.classList.toggle('hidden', !showModes);
  startButton.classList.toggle('hidden', showModes);
  if (!showModes) startButton.textContent = buttonText;
  overlay.classList.add('visible');
}

function showModeSelection() {
  running = false;
  paused = false;
  transitioning = false;
  current = null;
  resetInput();
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  pauseButton.textContent = 'Pause';
  prepareOverlay({
    eyebrow: 'SPIELMODUS',
    title: 'Neon Tetris',
    text: 'Wähle, wie du spielen möchtest.',
    showModes: true
  });
  draw();
}

function startGame(mode = gameMode) {
  if (!mode) {
    showModeSelection();
    return;
  }
  if (animationId) cancelAnimationFrame(animationId);
  gameMode = mode;
  board = createBoard();
  bag = [];
  nextQueue = [];
  holdType = null;
  holdUsed = false;
  score = 0;
  level = 1;
  linesThisLevel = 0;
  totalLines = 0;
  requiredLines = 8;
  dropInterval = gameMode === 'classic' ? getClassicDropInterval(level) : getLevelDropInterval(level);
  running = true;
  paused = false;
  transitioning = false;
  transitionElapsed = 0;
  lastTime = performance.now();
  fallProgress = 0;
  combo = -1;
  backToBack = false;
  lastAction = '';
  lastLayoutKey = '';
  scorePopupText = '';
  scorePopupTimer = 0;
  resetLockState();
  resetInput();
  loadHighscore();
  ensureQueue(6);
  spawnPiece();
  updateUI();
  drawPreviews();
  overlay.classList.remove('visible');
  pauseButton.textContent = 'Pause';
  animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (!running || transitioning) return;
  paused = !paused;
  pauseButton.textContent = paused ? 'Weiter' : 'Pause';
  if (paused) {
    resetInput();
    prepareOverlay({
      eyebrow: gameMode === 'classic' ? 'KLASSISCHES TETRIS' : 'LEVELMODUS',
      title: 'Pausiert',
      text: 'Drücke P oder klicke auf „Weiter“, um fortzufahren.',
      buttonText: 'Weiter'
    });
  } else {
    lastTime = performance.now();
    overlay.classList.remove('visible');
  }
}

function gameOver() {
  running = false;
  paused = false;
  resetInput();
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  draw();
  prepareOverlay({
    eyebrow: gameMode === 'classic' ? 'KLASSISCHES TETRIS' : 'LEVELMODUS',
    title: 'Game Over',
    text: `Punkte: ${score.toLocaleString('de-DE')} · Level: ${level} · Linien: ${gameMode === 'classic' ? totalLines : linesThisLevel}`,
    buttonText: 'Neu starten'
  });
  pauseButton.textContent = 'Pause';
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  const controlledKeys = ['arrowleft','arrowright','arrowdown','arrowup','a','d','s','w','z','c','shift',' ','p'];
  if (controlledKeys.includes(key)) event.preventDefault();
  if (key === 'p' && !event.repeat) {
    togglePause();
    return;
  }
  if (!running || paused || transitioning) return;
  if (key === 'arrowleft' || key === 'a') input.left = true;
  else if (key === 'arrowright' || key === 'd') input.right = true;
  else if (key === 'arrowdown' || key === 's') softDropHeld = true;
  else if ((key === 'arrowup' || key === 'w') && !event.repeat) rotatePiece(1);
  else if (key === 'z' && !event.repeat) rotatePiece(-1);
  else if ((key === 'c' || key === 'shift') && !event.repeat) holdPiece();
  else if (key === ' ' && !event.repeat) hardDrop();
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') input.left = false;
  else if (key === 'arrowright' || key === 'd') input.right = false;
  else if (key === 'arrowdown' || key === 's') softDropHeld = false;
}

modeChoiceButtons.forEach(button => {
  button.addEventListener('click', () => startGame(button.dataset.mode));
});
startButton.addEventListener('click', () => running && paused ? togglePause() : startGame());
pauseButton.addEventListener('click', togglePause);
modeButton.addEventListener('click', showModeSelection);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', resetInput);

updateModeUI();
updateUI();
drawPreviews();
draw();
