const colors = [
    { id: 'red', hex: '#e53935', key: 'r', kr: '빨강', en: 'RED' },
    { id: 'blue', hex: '#1e88e5', key: 'b', kr: '파랑', en: 'BLUE' },
    { id: 'green', hex: '#43a047', key: 'g', kr: '초록', en: 'GREEN' },
    { id: 'yellow', hex: '#fbc02d', key: 'y', kr: '노랑', en: 'YELLOW' },
    { id: 'purple', hex: '#8e24aa', key: 'p', kr: '보라', en: 'PURPLE' },
    { id: 'black', hex: '#000000', key: 'k', kr: '검정', en: 'BLACK' },
    { id: 'white', hex: '#ffffff', key: 'w', kr: '하양', en: 'WHITE' }
];

let currentTrial = 0;
const totalPractice = 4;
const totalMain = 20;
let phase = 'start'; // 'start' or 'practice' or 'main' or 'done'
let currentStimulus = null;
let participantId = '';

// Main phase structured conditions
// 10 KR (5 Congruent, 5 Incongruent), 10 EN (5 Congruent, 5 Incongruent)
let mainTrialsSequence = [];

function generateMainTrials() {
    mainTrialsSequence = [];
    
    // Helper to get incongruent color
    const getIncongruent = (baseColorId) => {
        let options = colors.filter(c => c.id !== baseColorId);
        return options[Math.floor(Math.random() * options.length)];
    };
    
    // 5 KR Congruent
    for(let i=0; i<5; i++) {
        let c = colors[Math.floor(Math.random() * colors.length)];
        mainTrialsSequence.push({ isKorean: true, isCongruent: true, textObj: c, inkColorObj: c });
    }
    // 5 KR Incongruent
    for(let i=0; i<5; i++) {
        let textObj = colors[Math.floor(Math.random() * colors.length)];
        let inkColorObj = getIncongruent(textObj.id);
        mainTrialsSequence.push({ isKorean: true, isCongruent: false, textObj: textObj, inkColorObj: inkColorObj });
    }
    // 5 EN Congruent
    for(let i=0; i<5; i++) {
        let c = colors[Math.floor(Math.random() * colors.length)];
        mainTrialsSequence.push({ isKorean: false, isCongruent: true, textObj: c, inkColorObj: c });
    }
    // 5 EN Incongruent
    for(let i=0; i<5; i++) {
        let textObj = colors[Math.floor(Math.random() * colors.length)];
        let inkColorObj = getIncongruent(textObj.id);
        mainTrialsSequence.push({ isKorean: false, isCongruent: false, textObj: textObj, inkColorObj: inkColorObj });
    }
    
    // Shuffle the main trials sequence
    mainTrialsSequence.sort(() => Math.random() - 0.5);
}

// Metrics collection
let startTime = 0;
let resultsData = [];
let totalErrors = 0;

const phaseTitleEl = document.getElementById('phase-title');
const progressEl = document.getElementById('progress');
const stimulusWordEl = document.getElementById('stimulus-word');
const stimulusCardEl = document.querySelector('.stimulus-card');
const buttons = document.querySelectorAll('.pad-btn');
const startBtn = document.getElementById('start-btn');
const participantInput = document.getElementById('participant-id');
let acceptingInput = false;

function init() {
    startBtn.addEventListener('click', startExperiment);
    participantInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startExperiment();
    });
}

function startExperiment() {
    participantId = participantInput.value.trim();
    if (!participantId) {
        alert("참가자 ID를 입력해주세요!");
        return;
    }
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('task-screen').style.display = 'block';
    
    generateMainTrials();
    
    currentTrial = 0;
    phase = 'practice';
    document.addEventListener('keydown', handleKey);
    
    // Only bind pad buttons that have data-color (ignore start/reload buttons)
    buttons.forEach(btn => {
        if (btn.dataset.color) {
            btn.addEventListener('click', () => handleResponse(btn.dataset.color));
        }
    });
    
    // Start experiment
    nextTrial();
}

function nextTrial() {
    if (phase === 'practice' && currentTrial >= totalPractice) {
        phase = 'main';
        currentTrial = 0;
        alert("연습이 끝났습니다. 본 실험을 시작합니다!");
    } else if (phase === 'main' && currentTrial >= totalMain) {
        phase = 'done';
        showResults();
        return;
    }
    
    currentTrial++;
    updateUI();
    
    let inkColor, textObj, isKorean, isCongruent;
    
    if (phase === 'main') {
        const trialConfig = mainTrialsSequence[currentTrial - 1];
        inkColor = trialConfig.inkColorObj;
        textObj = trialConfig.textObj;
        isKorean = trialConfig.isKorean;
        isCongruent = trialConfig.isCongruent;
    } else {
        // Random for practice
        inkColor = colors[Math.floor(Math.random() * colors.length)];
        textObj = colors[Math.floor(Math.random() * colors.length)];
        isKorean = Math.random() < 0.5;
        isCongruent = (inkColor.id === textObj.id);
    }
    
    currentStimulus = {
        inkColor: inkColor.id,
        wordKr: textObj.kr,
        wordEn: textObj.en,
        isKorean: isKorean,
        isCongruent: isCongruent,
        correctKey: inkColor.key
    };
    
    // Update display
    stimulusWordEl.textContent = isKorean ? textObj.kr : textObj.en;
    stimulusWordEl.style.color = inkColor.hex;
    
    if (inkColor.id === 'white') {
        // Outline text so it's visible on white background
        stimulusWordEl.style.textShadow = "-1px -1px 0 #999, 1px -1px 0 #999, -1px 1px 0 #999, 1px 1px 0 #999";
    } else {
        stimulusWordEl.style.textShadow = "none";
    }
    
    acceptingInput = true;
    startTime = performance.now();
}

function updateUI() {
    const title = phase === 'practice' ? '연습' : '본 실험';
    const total = phase === 'practice' ? totalPractice : totalMain;
    phaseTitleEl.textContent = title;
    progressEl.textContent = `${title} ${currentTrial} / ${total}`;
}

function handleKey(e) {
    if (!acceptingInput || phase === 'done') return;
    const key = e.key.toLowerCase();
    const colorObj = colors.find(c => c.key === key);
    if (colorObj) {
        handleResponse(colorObj.id);
    }
}

function handleResponse(colorId) {
    if (!acceptingInput || phase === 'done' || phase === 'start') return;
    
    const rt = Math.round(performance.now() - startTime);
    acceptingInput = false; // Prevent double inputs
    
    const isCorrect = (colorId === currentStimulus.inkColor);
    
    // Record data for both practice and main
    if (phase === 'main' || phase === 'practice') {
        if (phase === 'main' && !isCorrect) totalErrors++;
        resultsData.push({ 
            participant: participantId,
            phase: phase,
            trial: currentTrial, 
            wordKr: currentStimulus.wordKr,
            wordEn: currentStimulus.wordEn,
            isKorean: currentStimulus.isKorean,
            isCongruent: currentStimulus.isCongruent,
            inkColor: currentStimulus.inkColor,
            responseColor: colorId,
            rt: rt, 
            error: !isCorrect
        });
    }
    
    if (isCorrect) {
        // Correct response
        setTimeout(nextTrial, 200);
    } else {
        // Incorrect response
        // Flash red, but proceed to next trial anyway
        stimulusCardEl.classList.add('error');
        setTimeout(() => {
            stimulusCardEl.classList.remove('error');
            setTimeout(nextTrial, 100);
        }, 300);
    }
}

function showResults() {
    stimulusWordEl.textContent = "수고하셨습니다";
    stimulusWordEl.style.color = "#333";
    stimulusWordEl.style.textShadow = "none";
    phaseTitleEl.textContent = "종료";
    progressEl.textContent = "-";
    
    // Hide UI elements
    document.querySelector('.keys-card').style.display = 'none';
    document.querySelector('.pad-card').style.display = 'none';
    document.querySelector('.instruction').style.display = 'none';
    
    // Calculate stats
    const mainTrialsOnly = resultsData.filter(d => d.phase === 'main');
    const avgRt = mainTrialsOnly.reduce((sum, data) => sum + data.rt, 0) / mainTrialsOnly.length;
    const errorRate = (totalErrors / totalMain) * 100;
    
    document.getElementById('avg-rt').textContent = Math.round(avgRt);
    document.getElementById('error-rate').textContent = errorRate.toFixed(1);
    
    // Filter data by language
    const krTrials = mainTrialsOnly.filter(d => d.isKorean);
    const enTrials = mainTrialsOnly.filter(d => !d.isKorean);
    
    const krAvgRt = krTrials.length > 0 ? krTrials.reduce((sum, d) => sum + d.rt, 0) / krTrials.length : 0;
    const enAvgRt = enTrials.length > 0 ? enTrials.reduce((sum, d) => sum + d.rt, 0) / enTrials.length : 0;
    
    const krErrorRate = krTrials.length > 0 ? (krTrials.filter(d => d.error).length / krTrials.length) * 100 : 0;
    const enErrorRate = enTrials.length > 0 ? (enTrials.filter(d => d.error).length / enTrials.length) * 100 : 0;
    
    // Congruency Accuracy Logic
    const krCongruentTrials = krTrials.filter(d => d.isCongruent);
    const enCongruentTrials = enTrials.filter(d => d.isCongruent);
    
    const krCongruentAcc = krCongruentTrials.length > 0 ? (krCongruentTrials.filter(d => !d.error).length / krCongruentTrials.length) * 100 : 0;
    const enCongruentAcc = enCongruentTrials.length > 0 ? (enCongruentTrials.filter(d => !d.error).length / enCongruentTrials.length) * 100 : 0;
    
    document.getElementById('kr-cong-acc').textContent = krCongruentAcc.toFixed(1);
    document.getElementById('en-cong-acc').textContent = enCongruentAcc.toFixed(1);
    
    // Show results section
    document.getElementById('results-container').style.display = 'block';
    
    // Chart 1: Line chart for all RTs
    const ctxRt = document.getElementById('rtChart').getContext('2d');
    new Chart(ctxRt, {
        type: 'line',
        data: {
            labels: mainTrialsOnly.map(d => d.trial),
            datasets: [{
                label: '반응시간 (ms)',
                data: mainTrialsOnly.map(d => d.rt),
                borderColor: '#1e88e5',
                backgroundColor: 'rgba(30, 136, 229, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: mainTrialsOnly.map(d => d.isKorean ? '#1e88e5' : '#43a047'), // Blue for KO, Green for EN
                pointBorderColor: mainTrialsOnly.map(d => d.error ? '#e53935' : (d.isKorean ? '#1e88e5' : '#43a047')), // Red border for errors
                pointBorderWidth: mainTrialsOnly.map(d => d.error ? 3 : 1),
                pointRadius: mainTrialsOnly.map(d => d.error ? 6 : 4),
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: '반응시간 (ms)' } },
                x: { title: { display: true, text: '시행횟수 (Trial)' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = mainTrialsOnly[context.dataIndex];
                            return `RT: ${data.rt}ms [${data.isKorean ? '한글' : '영어'}] ${data.error ? '(오답)' : ''}`;
                        }
                    }
                }
            }
        }
    });

    // Chart 2: Bar chart comparing KR/EN
    const ctxCompare = document.getElementById('compareChart').getContext('2d');
    new Chart(ctxCompare, {
        type: 'bar',
        data: {
            labels: ['한글', '영어'],
            datasets: [
                {
                    label: '평균 반응시간 (ms)',
                    data: [krAvgRt, enAvgRt],
                    backgroundColor: 'rgba(30, 136, 229, 0.7)',
                    borderColor: '#1e88e5',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: '정확도 (%)',
                    data: [100 - krErrorRate, 100 - enErrorRate],
                    backgroundColor: 'rgba(67, 160, 71, 0.7)',
                    borderColor: '#43a047',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '시간 (ms)' },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '정확도 (%)' },
                    min: 0,
                    max: 100,
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Google Apps Script Web App URL (여기에 복사한 URL을 붙여넣으세요)
// 예: "https://script.google.com/macros/s/AKfycb.../exec"
const GOOGLE_SCRIPT_URL = "여기에_웹앱_URL을_붙여넣으세요";

function saveToGoogleSheets() {
    if (resultsData.length === 0) {
        alert("저장할 데이터가 없습니다.");
        return;
    }

    if (GOOGLE_SCRIPT_URL === "여기에_웹앱_URL을_붙여넣으세요") {
        alert("구글 스프레드시트와 연결되지 않았습니다. script.js 파일에서 GOOGLE_SCRIPT_URL을 설정해주세요.");
        return;
    }

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.textContent = "저장 중...";
        saveBtn.disabled = true;
        saveBtn.style.opacity = "0.7";
        saveBtn.style.cursor = "not-allowed";
    }

    // 데이터를 서버로 보낼 형식으로 정리
    const payload = resultsData.map(row => {
        return {
            participant: row.participant,
            phase: row.phase,
            trial: row.trial,
            wordKr: row.wordKr,
            wordEn: row.wordEn,
            language: row.isKorean ? "Korean" : "English",
            congruency: row.isCongruent ? "Congruent" : "Incongruent",
            inkColor: row.inkColor,
            responseColor: row.responseColor,
            correct: !row.error ? "1" : "0",
            rt: row.rt
        };
    });

    // fetch를 사용하여 POST 요청 전송 (text/plain으로 CORS preflight 우회)
    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            alert("데이터가 성공적으로 구글 스프레드시트에 저장되었습니다!");
            if (saveBtn) saveBtn.textContent = "저장 완료";
        } else {
            alert("저장 실패: " + data.message);
            if (saveBtn) {
                saveBtn.textContent = "스프레드시트에 저장";
                saveBtn.disabled = false;
                saveBtn.style.opacity = "1";
                saveBtn.style.cursor = "pointer";
            }
        }
    })
    .catch(error => {
        console.error("Error!", error);
        alert("오류가 발생했습니다. 개발자 도구의 콘솔을 확인하세요.");
        if (saveBtn) {
            saveBtn.textContent = "스프레드시트에 저장";
            saveBtn.disabled = false;
            saveBtn.style.opacity = "1";
            saveBtn.style.cursor = "pointer";
        }
    });
}

// Ensure the page is ready
window.onload = init;
