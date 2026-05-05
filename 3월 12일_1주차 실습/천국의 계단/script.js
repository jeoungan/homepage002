const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const currentScoreElem = document.getElementById('currentScore');
const currentTimeElem = document.getElementById('currentTime');
const finalScoreElem = document.getElementById('finalScore');
const finalTimeElem = document.getElementById('finalTime');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let gameState = 'START'; // START, PLAYING, GAMEOVER
let startTime = 0;
let playTime = 0;
let autoScrollY = 0;
let scrollSpeed = 1.0;
let currentIdx = 0;
let score = 0;

let stairsPos = [];
let dirs = [];

// 플레이어 및 카메라 변수
let playerX = 0;
let playerY = 0;
let playerVisualX = 0;
let playerVisualY = 0;
let camX = 0;
let camY = 0;
let faceDir = 1;

// 애니메이션
let isFalling = false;
let fallVelocity = 0;
let playerTargetX = 0;

let stepX = 60;
let stepY = 40;
let stairWidth = 120;
let stairHeight = 20;

function generateMoreStairs(count = 50) {
    let startIdx = stairsPos.length;
    let lastStair = startIdx === 0 ? {x: 0, y: 0, dir: 0} : stairsPos[startIdx - 1];
    
    if (startIdx === 0) {
        stairsPos.push(lastStair);
        dirs.push(0);
        count--;
    }
    
    for(let i = 0; i < count; i++) {
        let dir = Math.random() < 0.5 ? -1 : 1;
        dirs.push(dir);
        let newStair = {
            x: lastStair.x + dir * stepX,
            y: lastStair.y + stepY,
            dir: dir
        };
        stairsPos.push(newStair);
        lastStair = newStair;
    }
}

function resetGame() {
    stairsPos = [];
    dirs = [];
    generateMoreStairs(100);
    
    currentIdx = 0;
    score = 0;
    currentScoreElem.innerText = score;
    faceDir = 1;
    
    playerX = 0;
    playerY = 0;
    playerVisualX = 0;
    playerVisualY = 0;
    camX = 0;
    camY = 0;
    
    isFalling = false;
    fallVelocity = 0;
    gameState = 'PLAYING';
    startTime = Date.now();
    playTime = 0;
    autoScrollY = 0;
    scrollSpeed = 1.0;
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    scoreDisplay.style.display = 'block';
    timeDisplay.style.display = 'block';
}

function handleInput(inputDir) {
    if (gameState !== 'PLAYING') return;
    
    faceDir = inputDir;
    let expectedDir = dirs[currentIdx + 1];
    
    if (inputDir === expectedDir) {
        currentIdx++;
        score++;
        currentScoreElem.innerText = score;
        
        playerX = stairsPos[currentIdx].x;
        playerY = stairsPos[currentIdx].y;
        
        if (currentIdx > stairsPos.length - 30) {
            generateMoreStairs(50);
        }
    } else {
        // 잘못된 방향 (게임 오버)
        gameState = 'GAMEOVER';
        isFalling = true;
        fallVelocity = -10; // 점프 뛰어 오르며 떨어지는 효과
        playerTargetX = playerVisualX + inputDir * 80;
        
        // 부드러운 전환을 위해 플레이어 위치 동기화
        playerX = playerVisualX;
        playerY = playerVisualY;
        
        setTimeout(() => {
            gameOverScreen.style.display = 'flex';
            finalScoreElem.innerText = score;
            finalTimeElem.innerText = playTime.toFixed(1);
            scoreDisplay.style.display = 'none';
            timeDisplay.style.display = 'none';
        }, 1200);
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleInput(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleInput(1);
    }
});

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);

function drawStair(x, y, opacity, isCurrent) {
    let topColor = isCurrent ? '#a5d6a7' : '#fdfdfd';
    let frontColor = isCurrent ? '#81c784' : '#cfcfcf';
    
    ctx.globalAlpha = opacity;
    
    // Top face
    ctx.fillStyle = topColor;
    ctx.fillRect(x - stairWidth/2, y, stairWidth, stairHeight);
    
    // Front face
    ctx.fillStyle = frontColor;
    ctx.fillRect(x - stairWidth/2, y + stairHeight, stairWidth, stairHeight);
    
    // Borders
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - stairWidth/2, y, stairWidth, stairHeight);
    ctx.strokeRect(x - stairWidth/2, y + stairHeight, stairWidth, stairHeight);
    
    ctx.globalAlpha = 1.0;
}

function drawPlayer(x, y) {
    let pWidth = 40;
    let pHeight = 50;
    
    let px = x - pWidth / 2;
    let py = y + 10 - pHeight;
    
    ctx.fillStyle = '#ff5722';
    
    // 머리/몸통 (라운드 렉탱글)
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(px, py, pWidth, pHeight, 10);
    } else {
        ctx.fillRect(px, py, pWidth, pHeight);
    }
    ctx.fill();
    
    // 눈 그리기 (방향에 따라 위치 조정)
    let eyeOffsetX = faceDir === 1 ? 12 : 0;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px + 8 + eyeOffsetX, py + 15, 6, 0, Math.PI*2);
    ctx.arc(px + 20 + eyeOffsetX, py + 15, 6, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    // 눈동자는 방향을 좀 더 바라보게
    let pupilOffsetX = faceDir === 1 ? 2 : -2;
    ctx.arc(px + 8 + eyeOffsetX + pupilOffsetX, py + 15, 3, 0, Math.PI*2);
    ctx.arc(px + 20 + eyeOffsetX + pupilOffsetX, py + 15, 3, 0, Math.PI*2);
    ctx.fill();
    
    // 입
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (gameState === 'GAMEOVER') {
        // O 모양 입 (놀람)
        ctx.arc(px + 14 + eyeOffsetX, py + 30, 4, 0, Math.PI*2);
        ctx.stroke();
    } else {
        // 웃는 입
        ctx.arc(px + 14 + eyeOffsetX, py + 25, 5, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
    }
}

function update() {
    if (gameState === 'START') return;

    if (gameState === 'PLAYING') {
        playTime = (Date.now() - startTime) / 1000;
        currentTimeElem.innerText = playTime.toFixed(1);
        
        // 시간 경과에 따라 스크롤 속도 증가
        scrollSpeed = 1.0 + playTime * 0.05;
        autoScrollY += scrollSpeed;
        
        // 플레이어가 카메라보다 훨씬 빨리 가면 autoScrollY도 당겨짐
        if (playerVisualY > autoScrollY + 150) {
            autoScrollY = playerVisualY - 150;
        }
    }

    if (!isFalling) {
        playerVisualX += (playerX - playerVisualX) * 0.4;
        playerVisualY += (playerY - playerVisualY) * 0.4;
    } else {
        fallVelocity += 0.8; // 중력
        playerVisualX += (playerTargetX - playerVisualX) * 0.15;
        playerVisualY += fallVelocity;
    }
    
    // 카메라 위치 계산 (떨어질 때는 카메라가 멈춰있거나 천천히 따라감)
    let targetCamX = isFalling ? camX : playerVisualX;
    let targetCamY = isFalling ? camY : Math.max(playerVisualY, autoScrollY);
    
    camX += (targetCamX - camX) * 0.15;
    camY += (targetCamY - camY) * 0.15;
    
    // 화면 위로 밀려나면 게임 오버
    if (gameState === 'PLAYING') {
        let screenY = playerVisualY - camY + canvas.height / 3;
        if (screenY < -60) {
            gameState = 'GAMEOVER';
            isFalling = true;
            fallVelocity = 0;
            playerTargetX = playerVisualX;
            
            setTimeout(() => {
                gameOverScreen.style.display = 'flex';
                finalScoreElem.innerText = score;
                finalTimeElem.innerText = playTime.toFixed(1);
                scoreDisplay.style.display = 'none';
                timeDisplay.style.display = 'none';
            }, 1200);
        }
    }
}

function render() {
    // 배경 채우기
    ctx.fillStyle = '#aed6f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'START') return;
    
    ctx.save();
    
    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 3;
    
    ctx.translate(screenCenterX - camX, screenCenterY - camY);
    
    // 계단 렌더링 범위
    let startIndex = Math.max(0, currentIdx - 15);
    let endIndex = Math.min(stairsPos.length, Math.max(currentIdx + 25, 25));
    
    for(let i = startIndex; i < endIndex; i++) {
        let s = stairsPos[i];
        
        // 투명도 (지나간 계단은 서서히 사라짐)
        let opacity = 1.0;
        if (i < currentIdx - 2) {
            opacity = Math.max(0, 1.0 - (currentIdx - 2 - i) * 0.15);
        }
        
        let isCurrent = (i === currentIdx && gameState === 'PLAYING');
        
        if (opacity > 0) {
            drawStair(s.x, s.y, opacity, isCurrent);
        }
    }
    
    // 플레이어 렌더링
    drawPlayer(playerVisualX, playerVisualY);
    
    ctx.restore();
}

function loop() {
    update();
    render();
    requestAnimationFrame(loop);
}

// 배경을 초기화하기 위해 루프 시작
requestAnimationFrame(loop);
