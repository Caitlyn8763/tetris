const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const DAS = 145;
const ARR = 42;
const LEVEL_TRANSITION_MS = 1400;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highscoreEl = document