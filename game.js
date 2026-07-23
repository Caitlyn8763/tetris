const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const LINES_PER_LEVEL = 10;
const LOCK_DELAY = 350;
const DAS = 145;
const ARR = 42;

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
  S: '#52e36c', T: '#b65cff', Z: '#ff5573'
};

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
};

let board = createBoard();
let current = null;
let nextPiece = null;
let bag = [];
let score = 0;
let highscore = Number(localStorage.getItem('neonTetrisHighscore') || 0);
let totalLines = 0;
let level = 1;
let dropInterval = 950;
let running = false;
let paused = false;
let lastTime = 0;
let animationId = null;
let fallProgress = 0;
let lockTimer = 0;
let softDropHeld = false;

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
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: -topPadding(matrix),
    renderX: 0
  };
}

function spawnPiece() {
  current = nextPiece || createPiece(getBagPiece());
  current.x = Math.floor((COLS - current.matrix[0].length) / 2);
  current.y = -topPadding(current.matrix);
  current.renderX = current.x;
  fallProgress = 0;
  lockTimer = 0;
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
  if (!running || paused) return;
  const rotated = rotateMatrix(current.matrix);
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collides(rotated, current.x + kick, current.y)) {
      current.matrix = rotated;
      current.x += kick;
      current.renderX = current.x;
      lockTimer = 0;
      return;
    }
  }
}

function movePiece(direction) {
  if (!running || paused || !current) return false;
  const target = current.x + direction;
  if (collides(current.matrix, target, current.y)) return false;
  current.x = target;
  lockTimer = 0;
  return true;
}

function softDropStep() {
  if (!running || paused || !current) return;
  if (!collides(current.matrix, current.x, current.y + 1)) {
    current.y++;
    fallProgress = 0;
    addScore(1);
  }
}

function hardDrop() {
  if (!running || paused || !current) return;
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
  mergePiece();
  clearLines();
  spawnPiece();
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

  addScore([0, 100, 300, 500, 800][cleared] * level);
  totalLines += cleared;
  level = Math.floor(totalLines / LINES_PER_LEVEL) + 1;
  dropInterval = getDropInterval(level);
  updateUI();
}

function getDropInterval(currentLevel) {
  return Math.max(70, Math.round(950 * Math.pow(0.82, currentLevel - 1)));
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
  const progress = totalLines % LINES_PER_LEVEL;
  scoreEl.textContent = score.toLocaleString('de-DE');
  highscoreEl.textContent = highscore.toLocaleString('de-DE');
  levelEl.textContent = level;
  linesEl.textContent = totalLines;
  levelProgressEl.textContent = `${progress} / ${LINES_PER_LEVEL}`;
  progressBar.style.width = `${progress / LINES_PER_LEVEL * 100}%`;
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

  context.fillStyle = 'rgba(255,255,255,.32)';
  roundedRect(context, bx + bs * 0.15, by + bs * 0.14, bs * 0.7, Math.max(2, bs * 0.08), 3);
  context.fill();
  context.restore();
}

function drawGrid() {
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
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
  if (current) drawPiece(current);
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
  const effectiveInterval = softDropHeld ? Math.max(28, dropInterval / 18) : dropInterval;
  current.renderX += (current.x - current.renderX) * Math.min(1, delta / 48);

  if (!collides(current.matrix, current.x, current.y + 1)) {
    lockTimer = 0;
    fallProgress += delta / effectiveInterval;
    while (fallProgress >= 1 && !collides(current.matrix, current.x, current.y + 1)) {
      current.y++;
      fallProgress -= 1;
      if (softDropHeld) addScore(1);
    }
    if (collides(current.matrix, current.x, current.y + 1)) fallProgress = Math.min(fallProgress, 0.999);
  } else {
    fallProgress = 0;
    lockTimer += delta;
    if (lockTimer >= LOCK_DELAY) lockPiece();
  }
}

function gameLoop(time = 0) {
  if (!running) return;
  const delta = Math.min(50, time - lastTime || 0);
  lastTime = time;
  if (!paused) {
    updateHorizontalInput(delta);
    updateFall(delta);
    draw();
  }
  animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);
  board = createBoard();
  bag = [];
  score = 0;
  totalLines = 0;
  level = 1;
  dropInterval = getDropInterval(level);
  running = true;
  paused = false;
  lastTime = performance.now();
  fallProgress = 0;
  lockTimer = 0;
  softDropHeld = false;
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
  if (!running) return;
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
  overlayText.textContent = `Punkte: ${score.toLocaleString('de-DE')} · Linien: ${totalLines} · Level: ${level}`;
  startButton.textContent = 'Neu starten';
  overlay.classList.add('visible');
  pauseButton.textContent = 'Pause';
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (['arrowleft','arrowright','arrowdown','arrowup','a','d','s','w',' ','p'].includes(key)) event.preventDefault();
  if (key === 'p' && !event.repeat) return togglePause();
  if (!running || paused) return;

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
