const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const DAS = 145;
const ARR = 42;
const LOCK_DELAY = 380;
const MAX_LOCK_RESETS = 12;
const LEVEL_TRANSITION_MS = 1400;
const LINE_CLEAR_POINTS = [0, 100, 300, 500, 800];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const levelProgressEl = document.getElementById('levelProgress');
const progressBar = document.getElementById('progressBar');
const speedEl = document.getElementById('speed');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');

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

let board = createBoard();
let current = null;
let nextPiece = null;
let bag = [];
let score = 0;
let highscore = Number(localStorage.getItem('neonTetrisHighscore') || 0);
let level = 1;
let linesThisLevel = 0;
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

const input = { left:false, right:false, horizontalDirection:0, horizontalHeldFor:0, repeatAccumulator:0 };

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function getBagPiece() {
  if (!bag.length) bag = shuffle(Object.keys(SHAPES));
  return bag.pop();
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
  return { type, matrix, x:Math.floor((COLS - matrix[0].length) / 2), y:-topPadding(matrix), renderX:0 };
}

function resetLockState() {
  lockTimer = 0;
  lockResets = 0;
}

function spawnPiece() {
  current = nextPiece || createPiece(getBagPiece());
  current.x = Math.floor((COLS - current.matrix[0].length) / 2);
  current.y = -topPadding(current.matrix);
  current.renderX = current.x;
  fallProgress = 0;
  resetLockState();
  nextPiece = createPiece(getBagPiece());
  drawNext();
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

function mergePiece() {
  current.matrix.forEach((row, y) => row.forEach((value, x) => {
    if (!value) return;
    const py = current.y + y;
    if (py >= 0) board[py][current.x + x] = current.type;
  }));
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function rotatePiece() {
  if (!running || paused || transitioning || !current) return;
  const rotated = rotateMatrix(current.matrix);
  for (const kick of [0,-1,1,-2,2]) {
    if (!collides(rotated, current.x + kick, current.y)) {
      current.matrix = rotated;
      current.x += kick;
      current.renderX = current.x;
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
  addScore(distance * 2);
  fallProgress = 0;
  lockPiece();
}

function lockPiece() {
  if (!current || transitioning) return;
  mergePiece();
  current = null;
  resetLockState();
  clearLines();
  if (!transitioning && running) spawnPiece();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      y++;
    }
  }
  if (!cleared) return;

  const linePoints = LINE_CLEAR_POINTS[cleared] * level;
  addScore(linePoints);
  scorePopupText = `${cleared} ${cleared === 1 ? 'REIHE' : 'REIHEN'}  +${linePoints.toLocaleString('de-DE')}`;
  scorePopupTimer = 950;
  linesThisLevel += cleared;
  updateUI();

  if (linesThisLevel >= requiredLines) beginLevelTransition();
}

function beginLevelTransition() {
  transitioning = true;
  transitionElapsed = 0;
  current = null;
  board = createBoard();
  resetLockState();
  input.left = false;
  input.right = false;
  softDropHeld = false;
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
  dropInterval = getDropInterval(level);
  board = chooseLayout(level);
  bag = [];
  nextPiece = createPiece(getBagPiece());
  transitioning = false;
  transitionElapsed = 0;
  spawnPiece();
  updateUI();
}

function getDropInterval(currentLevel) {
  return Math.max(75, Math.round(950 * Math.pow(0.86, currentLevel - 1)));
}

function addScore(points) {
  score += points;
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('neonTetrisHighscore', String(highscore));
  }
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score.toLocaleString('de-DE');
  highscoreEl.textContent = highscore.toLocaleString('de-DE');
  levelEl.textContent = level;
  linesEl.textContent = linesThisLevel;
  levelProgressEl.textContent = `${Math.min(linesThisLevel, requiredLines)} / ${requiredLines}`;
  progressBar.style.width = `${Math.min(100, linesThisLevel / requiredLines * 100)}%`;
  speedEl.textContent = `${(950 / dropInterval).toFixed(1)}x`;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function adjustColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawCell(context, x, y, color, size = BLOCK) {
  const px = x * size;
  const py = y * size;
  const gap = Math.max(1.5, size * 0.055);
  const bx = px + gap;
  const by = py + gap;
  const bs = size - gap * 2;
  const radius = Math.max(4, size * 0.18);

  context.save();
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

function getBoardColor() {
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
    ctx.beginPath(); ctx.moveTo(x * BLOCK, 0); ctx.lineTo(x * BLOCK, canvas.height); ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * BLOCK); ctx.lineTo(canvas.width, y * BLOCK); ctx.stroke();
  }
}

function drawBoard() {
  board.forEach((row, y) => row.forEach((type, x) => {
    if (type) drawCell(ctx, x, y, COLORS[type]);
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
  const progress = 1 - scorePopupTimer / 950;
  ctx.save();
  ctx.globalAlpha = Math.min(1, scorePopupTimer / 220);
  ctx.textAlign = 'center';
  ctx.font = '800 20px system-ui';
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

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const size = 24;
  const matrix = nextPiece.matrix;
  let minX = matrix[0].length, maxX = 0, minY = matrix.length, maxY = 0;
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }));
  const offsetX = (nextCanvas.width - (maxX - minX + 1) * size) / 2 - minX * size;
  const offsetY = (nextCanvas.height - (maxY - minY + 1) * size) / 2 - minY * size;
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) drawCell(nextCtx, x + offsetX / size, y + offsetY / size, COLORS[nextPiece.type], size);
  }));
}

function draw() {
  drawGrid();
  drawBoard();
  if (current && !transitioning) drawPiece(current);
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
    if (softDropHeld) addScore(1);
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

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);
  board = createBoard();
  bag = [];
  score = 0;
  level = 1;
  linesThisLevel = 0;
  requiredLines = 8;
  dropInterval = getDropInterval(level);
  running = true;
  paused = false;
  transitioning = false;
  lastTime = performance.now();
  fallProgress = 0;
  resetLockState();
  softDropHeld = false;
  lastLayoutKey = '';
  scorePopupText = '';
  scorePopupTimer = 0;
  input.left = false;
  input.right = false;
  input.horizontalDirection = 0;
  nextPiece = createPiece(getBagPiece());
  spawnPiece();
  updateUI();
  overlay.classList.remove('visible');
  pauseButton.textContent = 'Pause';
  animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (!running || transitioning) return;
  paused = !paused;
  pauseButton.textContent = paused ? 'Weiter' : 'Pause';
  if (paused) {
    overlayTitle.textContent = 'Pausiert';
    overlayText.textContent = 'Drücke P oder klicke auf „Weiter“, um fortzufahren.';
    startButton.textContent = 'Weiter';
    overlay.classList.add('visible');
  } else {
    lastTime = performance.now();
    overlay.classList.remove('visible');
  }
}

function gameOver() {
  running = false;
  paused = false;
  if (animationId) cancelAnimationFrame(animationId);
  draw();
  overlayTitle.textContent = 'Game Over';
  overlayText.textContent = `Punkte: ${score.toLocaleString('de-DE')} · Level: ${level}`;
  startButton.textContent = 'Neu starten';
  overlay.classList.add('visible');
  pauseButton.textContent = 'Pause';
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (['arrowleft','arrowright','arrowdown','arrowup','a','d','s','w',' ','p'].includes(key)) event.preventDefault();
  if (key === 'p' && !event.repeat) return togglePause();
  if (!running || paused || transitioning) return;
  if (key === 'arrowleft' || key === 'a') input.left = true;
  else if (key === 'arrowright' || key === 'd') input.right = true;
  else if (key === 'arrowdown' || key === 's') softDropHeld = true;
  else if ((key === 'arrowup' || key === 'w') && !event.repeat) rotatePiece();
  else if (key === ' ' && !event.repeat) hardDrop();
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') input.left = false;
  else if (key === 'arrowright' || key === 'd') input.right = false;
  else if (key === 'arrowdown' || key === 's') softDropHeld = false;
}

startButton.addEventListener('click', () => running && paused ? togglePause() : startGame());
pauseButton.addEventListener('click', togglePause);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', () => {
  input.left = false;
  input.right = false;
  softDropHeld = false;
});

updateUI();
draw();
