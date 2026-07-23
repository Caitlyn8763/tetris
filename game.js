const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
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
  I: '#43d9ff',
  J: '#4f67ff',
  L: '#ff9f43',
  O: '#ffe14d',
  S: '#54e36f',
  T: '#b55cff',
  Z: '#ff5470'
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

let board;
let current;
let nextPiece;
let bag = [];
let score = 0;
let totalLines = 0;
let level = 1;
let linesInLevel = 0;
let requiredLines = 6;
let dropInterval = 900;
let lastTime = 0;
let dropCounter = 0;
let running = false;
let paused = false;
let animationId = null;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getBagPiece() {
  if (bag.length === 0) bag = shuffle(Object.keys(SHAPES));
  return bag.pop();
}

function createPiece(type) {
  const matrix = SHAPES[type].map(row => [...row]);
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: -getTopPadding(matrix)
  };
}

function getTopPadding(matrix) {
  let padding = 0;
  for (const row of matrix) {
    if (row.some(Boolean)) break;
    padding++;
  }
  return padding;
}

function spawnPiece() {
  current = nextPiece || createPiece(getBagPiece());
  current.x = Math.floor((COLS - current.matrix[0].length) / 2);
  current.y = -getTopPadding(current.matrix);
  nextPiece = createPiece(getBagPiece());
  drawNext();
  if (collides(current.matrix, current.x, current.y)) gameOver();
}

function collides(matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const boardX = offsetX + x;
      const boardY = offsetY + y;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && board[boardY][boardX]) return true;
    }
  }
  return false;
}

function mergePiece() {
  current.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = current.y + y;
      if (boardY >= 0) board[boardY][current.x + x] = current.type;
    });
  });
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
}

function rotatePiece() {
  if (!running || paused) return;
  const rotated = rotateMatrix(current.matrix);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(rotated, current.x + kick, current.y)) {
      current.matrix = rotated;
      current.x += kick;
      return;
    }
  }
}

function movePiece(direction) {
  if (!running || paused) return;
  if (!collides(current.matrix, current.x + direction, current.y)) current.x += direction;
}

function softDrop(manual = false) {
  if (!running || paused) return;
  if (!collides(current.matrix, current.x, current.y + 1)) {
    current.y++;
    if (manual) score += 1;
  } else {
    lockPiece();
  }
  dropCounter = 0;
  updateUI();
}

function hardDrop() {
  if (!running || paused) return;
  let distance = 0;
  while (!collides(current.matrix, current.x, current.y + 1)) {
    current.y++;
    distance++;
  }
  score += distance * 2;
  lockPiece();
  updateUI();
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

  const lineScores = [0, 100, 300, 500, 800];
  score += lineScores[cleared] * level;
  totalLines += cleared;
  linesInLevel += cleared;

  while (linesInLevel >= requiredLines) {
    linesInLevel -= requiredLines;
    level++;
    requiredLines = 6 + (level - 1) * 2;
    dropInterval = Math.max(90, Math.round(900 * Math.pow(0.83, level - 1)));
  }

  updateUI();
}

function getSpeedMultiplier() {
  return (900 / dropInterval).toFixed(1);
}

function updateUI() {
  scoreEl.textContent = score.toLocaleString('de-DE');
  levelEl.textContent = level;
  linesEl.textContent = totalLines;
  levelProgressEl.textContent = `${linesInLevel} / ${requiredLines}`;
  progressBar.style.width = `${Math.min(100, linesInLevel / requiredLines * 100)}%`;
  speedEl.textContent = `${getSpeedMultiplier()}x`;
}

function drawCell(context, x, y, color, size = BLOCK) {
  const px = x * size;
  const py = y * size;
  const gradient = context.createLinearGradient(px, py, px + size, py + size);
  gradient.addColorStop(0, lighten(color, 22));
  gradient.addColorStop(1, color);
  context.fillStyle = gradient;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,.18)';
  context.fillRect(px + 3, py + 3, size - 6, 3);
  context.strokeStyle = 'rgba(255,255,255,.2)';
  context.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
}

function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 255) + amount);
  const b = Math.min(255, (n & 255) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawGrid() {
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
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

function drawPiece(piece) {
  piece.matrix.forEach((row, y) => row.forEach((value, x) => {
    const drawY = piece.y + y;
    if (value && drawY >= 0) drawCell(ctx, piece.x + x, drawY, COLORS[piece.type]);
  }));
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = 'rgba(0,0,0,.12)';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;

  const size = 24;
  const matrix = nextPiece.matrix;
  const usedRows = matrix.filter(row => row.some(Boolean));
  let minX = matrix[0].length;
  let maxX = 0;
  matrix.forEach(row => row.forEach((value, x) => {
    if (value) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  }));
  const width = (maxX - minX + 1) * size;
  const height = usedRows.length * size;
  const offsetX = (nextCanvas.width - width) / 2 - minX * size;
  const offsetY = (nextCanvas.height - height) / 2 - getTopPadding(matrix) * size;

  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) drawCell(nextCtx, x + offsetX / size, y + offsetY / size, COLORS[nextPiece.type], size);
  }));
}

function draw() {
  drawGrid();
  drawBoard();
  if (current) drawPiece(current);
}

function gameLoop(time = 0) {
  if (!running) return;
  const delta = time - lastTime;
  lastTime = time;
  if (!paused) {
    dropCounter += delta;
    if (dropCounter >= dropInterval) softDrop(false);
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
  linesInLevel = 0;
  requiredLines = 6;
  dropInterval = 900;
  lastTime = 0;
  dropCounter = 0;
  paused = false;
  running = true;
  nextPiece = createPiece(getBagPiece());
  spawnPiece();
  updateUI();
  overlay.classList.remove('visible');
  pauseButton.textContent = 'Pause';
  gameLoop();
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
    overlay.classList.remove('visible');
    lastTime = performance.now();
  }
}

function gameOver() {
  running = false;
  paused = false;
  if (animationId) cancelAnimationFrame(animationId);
  draw();
  overlayTitle.textContent = 'Game Over';
  overlayText.textContent = `Du hast ${score.toLocaleString('de-DE')} Punkte erreicht, ${totalLines} Linien gelöscht und Level ${level} erreicht.`;
  startButton.textContent = 'Neu starten';
  overlay.classList.add('visible');
  pauseButton.textContent = 'Pause';
}

function handleKey(event) {
  const key = event.key.toLowerCase();
  const controlled = ['arrowleft','arrowright','arrowdown','arrowup','a','d','s','w',' ','p'];
  if (controlled.includes(key)) event.preventDefault();

  if (key === 'p') return togglePause();
  if (!running || paused) return;

  if (key === 'arrowleft' || key === 'a') movePiece(-1);
  else if (key === 'arrowright' || key === 'd') movePiece(1);
  else if (key === 'arrowdown' || key === 's') softDrop(true);
  else if (key === 'arrowup' || key === 'w') rotatePiece();
  else if (key === ' ') hardDrop();

  draw();
}

startButton.addEventListener('click', () => {
  if (running && paused) togglePause();
  else startGame();
});
pauseButton.addEventListener('click', togglePause);
document.addEventListener('keydown', handleKey);

board = createBoard();
draw();
updateUI();
