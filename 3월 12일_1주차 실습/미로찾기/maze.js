const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');

const cols = 20;
const rows = 20;
const cellSize = 30; // 픽셀 단위 셀 크기

canvas.width = cols * cellSize;
canvas.height = rows * cellSize;

let grid = [];
let current;
let stack = [];
let player = { x: 0, y: 0 };
let goal = { x: cols - 1, y: rows - 1 };

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.walls = [true, true, true, true]; // 위, 오른쪽, 아래, 왼쪽
        this.visited = false;
    }

    checkNeighbors() {
        let neighbors = [];

        let top = grid[index(this.x, this.y - 1)];
        let right = grid[index(this.x + 1, this.y)];
        let bottom = grid[index(this.x, this.y + 1)];
        let left = grid[index(this.x - 1, this.y)];

        if (top && !top.visited) {
            neighbors.push(top);
        }
        if (right && !right.visited) {
            neighbors.push(right);
        }
        if (bottom && !bottom.visited) {
            neighbors.push(bottom);
        }
        if (left && !left.visited) {
            neighbors.push(left);
        }

        if (neighbors.length > 0) {
            let r = Math.floor(Math.random() * neighbors.length);
            return neighbors[r];
        } else {
            return undefined;
        }
    }

    show() {
        let x = this.x * cellSize;
        let y = this.y * cellSize;

        ctx.strokeStyle = '#6c7086'; // 벽 색상
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        if (this.walls[0]) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
            ctx.stroke();
        }
        if (this.walls[1]) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
            ctx.stroke();
        }
        if (this.walls[2]) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize, y + cellSize);
            ctx.lineTo(x, y + cellSize);
            ctx.stroke();
        }
        if (this.walls[3]) {
            ctx.beginPath();
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
}

function index(x, y) {
    if (x < 0 || y < 0 || x > cols - 1 || y > rows - 1) {
        return -1;
    }
    return x + y * cols;
}

function setupMaze() {
    grid = [];
    stack = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = new Cell(x, y);
            grid.push(cell);
        }
    }

    current = grid[0];
    current.visited = true;
    
    // 미로 자동 생성
    generateMaze();

    player = { x: 0, y: 0 };
    goal = { x: cols - 1, y: rows - 1 };

    draw();
}

function generateMaze() {
    let generating = true;
    while (generating) {
        let next = current.checkNeighbors();
        if (next) {
            next.visited = true;
            stack.push(current);
            removeWalls(current, next);
            current = next;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            generating = false;
        }
    }
}

function removeWalls(a, b) {
    let x = a.x - b.x;
    if (x === 1) {
        a.walls[3] = false;
        b.walls[1] = false;
    } else if (x === -1) {
        a.walls[1] = false;
        b.walls[3] = false;
    }

    let y = a.y - b.y;
    if (y === 1) {
        a.walls[0] = false;
        b.walls[2] = false;
    } else if (y === -1) {
        a.walls[2] = false;
        b.walls[0] = false;
    }
}

function draw() {
    // 배경
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < grid.length; i++) {
        grid[i].show();
    }

    // 목적지 그리기
    ctx.fillStyle = '#a6e3a1'; // 초록색 목적지
    ctx.fillRect(goal.x * cellSize + 4, goal.y * cellSize + 4, cellSize - 8, cellSize - 8);

    // 플레이어 그리기
    ctx.fillStyle = '#89b4fa'; // 파란색 플레이어
    ctx.beginPath();
    ctx.arc(player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2, cellSize / 2 - 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // 승리 조건 체크
    if (player.x === goal.x && player.y === goal.y) {
        setTimeout(() => {
            alert("축하합니다! 목적지에 도착했습니다!");
            setupMaze();
        }, 50);
    }
}

window.addEventListener('keydown', (e) => {
    let currentCell = grid[index(player.x, player.y)];
    
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault(); // 스크롤 방지
    }
    
    if (e.key === 'ArrowUp' && !currentCell.walls[0]) {
        player.y--;
    } else if (e.key === 'ArrowRight' && !currentCell.walls[1]) {
        player.x++;
    } else if (e.key === 'ArrowDown' && !currentCell.walls[2]) {
        player.y++;
    } else if (e.key === 'ArrowLeft' && !currentCell.walls[3]) {
        player.x--;
    }

    draw();
});

restartBtn.addEventListener('click', setupMaze);

// 게임 초기화
setupMaze();
