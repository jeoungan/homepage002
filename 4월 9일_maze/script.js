const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const timeDisplay = document.getElementById('timeDisplay');
const levelDisplay = document.getElementById('levelDisplay');

let cols, rows;
let w; // cell width
let grid = [];
let current;
let stack = [];
let player = { x: 0, y: 0 };
let goal = { x: 0, y: 0 };
let isPlaying = false;
let startTime;
let timerInterval;
let animationFrame;

// Game configs
const levels = {
    easy: { cols: 10, rows: 10 },
    medium: { cols: 15, rows: 15 },
    hard: { cols: 25, rows: 25 }
};

class Cell {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.walls = [true, true, true, true]; // top, right, bottom, left
        this.visited = false;
    }

    checkNeighbors() {
        let neighbors = [];
        let top = grid[index(this.i, this.j - 1)];
        let right = grid[index(this.i + 1, this.j)];
        let bottom = grid[index(this.i, this.j + 1)];
        let left = grid[index(this.i - 1, this.j)];

        if (top && !top.visited) neighbors.push(top);
        if (right && !right.visited) neighbors.push(right);
        if (bottom && !bottom.visited) neighbors.push(bottom);
        if (left && !left.visited) neighbors.push(left);

        if (neighbors.length > 0) {
            let r = Math.floor(Math.random() * neighbors.length);
            return neighbors[r];
        } else {
            return undefined;
        }
    }

    draw() {
        let x = this.i * w;
        let y = this.j * w;
        
        ctx.strokeStyle = '#1e293b'; 
        ctx.lineWidth = Math.max(2, w * 0.1);
        ctx.lineCap = 'round';

        if (this.walls[0]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
        if (this.walls[1]) { ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + w); ctx.stroke(); }
        if (this.walls[2]) { ctx.beginPath(); ctx.moveTo(x + w, y + w); ctx.lineTo(x, y + w); ctx.stroke(); }
        if (this.walls[3]) { ctx.beginPath(); ctx.moveTo(x, y + w); ctx.lineTo(x, y); ctx.stroke(); }
    }
}

function index(i, j) {
    if (i < 0 || j < 0 || i > cols - 1 || j > rows - 1) {
        return -1;
    }
    return i + j * cols;
}

function removeWalls(a, b) {
    let x = a.i - b.i;
    if (x === 1) { a.walls[3] = false; b.walls[1] = false; }
    else if (x === -1) { a.walls[1] = false; b.walls[3] = false; }
    
    let y = a.j - b.j;
    if (y === 1) { a.walls[0] = false; b.walls[2] = false; }
    else if (y === -1) { a.walls[2] = false; b.walls[0] = false; }
}

function generateMaze() {
    grid = [];
    stack = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            let cell = new Cell(i, j);
            grid.push(cell);
        }
    }
    
    current = grid[0];
    current.visited = true;

    // Iterative DFS for maze generation
    while (true) {
        let next = current.checkNeighbors();
        if (next) {
            next.visited = true;
            stack.push(current);
            removeWalls(current, next);
            current = next;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break; 
        }
    }
}

function initGame(level) {
    cols = levels[level].cols;
    rows = levels[level].rows;
    levelDisplay.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    
    // Setup canvas resolution to be sharp
    const parentContainer = document.querySelector('.game-area');
    const size = Math.min(parentContainer.clientWidth, 600);
    
    canvas.width = size * 2; // For high DPI (retina displays)
    canvas.height = size * 2;
    w = canvas.width / cols;
    
    generateMaze();
    
    player.x = 0;
    player.y = 0;
    goal.x = cols - 1;
    goal.y = rows - 1;
    
    startTime = Date.now();
    clearInterval(timerInterval);
    timeDisplay.textContent = "0";
    timerInterval = setInterval(() => {
        let seconds = Math.floor((Date.now() - startTime) / 1000);
        timeDisplay.textContent = seconds;
    }, 1000);

    isPlaying = true;
    overlay.classList.add('hidden');
    
    cancelAnimationFrame(animationFrame);
    drawGame();
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let i = 0; i < grid.length; i++) {
        grid[i].draw();
    }
    
    // Draw Goal
    let gx = goal.x * w + w / 2;
    let gy = goal.y * w + w / 2;
    let pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    
    ctx.beginPath();
    ctx.arc(gx, gy, w * 0.3 + w * 0.1 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#ec4899';
    ctx.shadowBlur = 20 * pulse + 10;
    ctx.shadowColor = '#ec4899';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Player
    let px = player.x * w + w / 2;
    let py = player.y * w + w / 2;
    
    ctx.beginPath();
    ctx.arc(px, py, w * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isPlaying) {
        animationFrame = requestAnimationFrame(drawGame);
    }
}

function movePlayer(dx, dy) {
    if (!isPlaying) return;
    
    let cell = grid[index(player.x, player.y)];
    
    if (dy === -1 && !cell.walls[0]) player.y--; // Up
    else if (dx === 1 && !cell.walls[1]) player.x++; // Right
    else if (dy === 1 && !cell.walls[2]) player.y++; // Down
    else if (dx === -1 && !cell.walls[3]) player.x--; // Left
    
    checkWin();
}

function checkWin() {
    if (player.x === goal.x && player.y === goal.y) {
        isPlaying = false;
        clearInterval(timerInterval);
        
        let seconds = Math.floor((Date.now() - startTime) / 1000);
        
        setTimeout(() => {
            overlayTitle.textContent = "Level Cleared!";
            overlayTitle.style.color = "#4ade80";
            overlayMessage.textContent = `You finished in ${seconds} seconds!`;
            
            // Adjust buttons for replay
            overlay.classList.remove('hidden');
        }, 300);
    }
}

window.addEventListener('keydown', (e) => {
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    
    if (e.key === 'ArrowUp') movePlayer(0, -1);
    else if (e.key === 'ArrowRight') movePlayer(1, 0);
    else if (e.key === 'ArrowDown') movePlayer(0, 1);
    else if (e.key === 'ArrowLeft') movePlayer(-1, 0);
});

// Mobile Controls Setup
const btnUp = document.getElementById('btnUp');
const btnRight = document.getElementById('btnRight');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');

function setupMobileButton(btn, dx, dy) {
    let interval;
    let initialDelayTimeout;

    const startMove = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        movePlayer(dx, dy);
        
        // Add hold-to-move effect
        initialDelayTimeout = setTimeout(() => {
            interval = setInterval(() => movePlayer(dx, dy), 120);
        }, 300); // 300ms delay before repeating
    };
    const endMove = (e) => {
        if (e) e.preventDefault();
        btn.classList.remove('active');
        clearTimeout(initialDelayTimeout);
        clearInterval(interval);
    };
    
    btn.addEventListener('touchstart', startMove, {passive: false});
    btn.addEventListener('touchend', endMove);
    btn.addEventListener('mousedown', startMove);
    btn.addEventListener('mouseup', endMove);
    btn.addEventListener('mouseleave', endMove);
}

setupMobileButton(btnUp, 0, -1);
setupMobileButton(btnRight, 1, 0);
setupMobileButton(btnDown, 0, 1);
setupMobileButton(btnLeft, -1, 0);

function startGame(level) {
    initGame(level);
}

// Ensure the game resizes correctly if window is resized (simple reload for now or just adjust rendering)
window.addEventListener('resize', () => {
    if (isPlaying) {
        // Redraw at new scale if necessary, but letting CSS handle the canvas scaling is okay here
    }
});
