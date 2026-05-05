const config = {
    practiceTrials: 5,
    mainTrials: 20, // 10 congruent, 10 incongruent
    fixationDuration: 500,
    blankDuration: 200,
    feedbackDuration: 800,
    colors: [
        { id: 'red', word: '빨강', hex: '#FF4B4B', key: '1' },
        { id: 'blue', word: '파랑', hex: '#4B9BFF', key: '2' },
        { id: 'green', word: '초록', hex: '#4BFF6B', key: '3' },
        { id: 'yellow', word: '노랑', hex: '#FFD44B', key: '4' }
    ]
};

let state = {
    phase: 'none', // 'start', 'practice', 'interstitial', 'main', 'end'
    trials: [],
    currentTrialIndex: 0,
    currentTrialTime: 0,
    results: [],
    isWaitingForInput: false,
    timeoutId: null,
    participantId: '',
    startTime: null,
    summary: null
};

// UI Elements
const screens = {
    start: document.getElementById('start-screen'),
    experiment: document.getElementById('experiment-screen'),
    interstitial: document.getElementById('interstitial-screen'),
    end: document.getElementById('end-screen')
};

const ui = {
    participantId: document.getElementById('participant-id'),
    phaseIndicator: document.getElementById('phase-indicator'),
    progressBar: document.getElementById('progress-bar'),
    trialCounter: document.getElementById('trial-counter'),
    fixation: document.getElementById('fixation'),
    word: document.getElementById('word'),
    feedback: document.getElementById('feedback'),
    colorBtns: document.querySelectorAll('.color-btn'),
    startBtn: document.getElementById('start-btn'),
    startMainBtn: document.getElementById('start-main-btn'),
    restartBtn: document.getElementById('restart-btn'),
    downloadCsvBtn: document.getElementById('download-csv-btn')
};

// --- Initialization ---

function init() {
    bindEvents();
    showScreen('start');
}

function bindEvents() {
    ui.startBtn.addEventListener('click', startPractice);
    ui.startMainBtn.addEventListener('click', startMain);
    ui.restartBtn.addEventListener('click', init);
    ui.downloadCsvBtn.addEventListener('click', downloadCSV);

    ui.colorBtns.forEach(btn => {
        const handleColorInput = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            const colorId = e.currentTarget.dataset.color;
            handleInput(colorId);
        };
        btn.addEventListener('click', handleColorInput);
        btn.addEventListener('touchstart', handleColorInput, { passive: false });
    });

    document.addEventListener('keydown', (e) => {
        if (!state.isWaitingForInput) return;
        const colorObj = config.colors.find(c => c.key === e.key);
        if (colorObj) {
            handleInput(colorObj.id);
        }
    });
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- Trial Generation ---

function generateTrials(count, forceEqualSplit = false) {
    let trials = [];
    if (forceEqualSplit) {
        // Create exactly equal distribution of ink colors (each 25%)
        let allInkColors = [];
        const loops = Math.ceil(count / config.colors.length);
        for(let i=0; i < loops; i++) {
            allInkColors.push(...config.colors);
        }
        allInkColors = allInkColors.slice(0, count);
        allInkColors = shuffleArray(allInkColors);
        
        // Exact 50/50 congruent/incongruent split
        const half = Math.floor(count / 2);
        const congColors = allInkColors.slice(0, half);
        const incongColors = allInkColors.slice(half, count);
        
        // Create congruent trials
        congColors.forEach(colorObj => {
            trials.push({
                word: colorObj.word,
                wordId: colorObj.id,
                colorHex: colorObj.hex,
                colorId: colorObj.id,
                isCongruent: true,
                correctAnswer: colorObj.id
            });
        });
        
        // Create incongruent trials
        incongColors.forEach(colorObj => {
            let options = config.colors.filter(c => c.id !== colorObj.id);
            let wordObj = options[Math.floor(Math.random() * options.length)];
            trials.push({
                word: wordObj.word,
                wordId: wordObj.id,
                colorHex: colorObj.hex,
                colorId: colorObj.id,
                isCongruent: false,
                correctAnswer: colorObj.id
            });
        });
        
        trials = shuffleArray(trials);
    } else {
        for (let i = 0; i < count; i++) {
            const isCongruent = Math.random() > 0.5;
            trials.push(createRandomTrial(isCongruent));
        }
    }
    return trials;
}

function generateSpecificTrials(count, isCongruent) {
    let trials = [];
    for (let i = 0; i < count; i++) {
        trials.push(createRandomTrial(isCongruent));
    }
    return trials;
}

function createRandomTrial(isCongruent) {
    const wordObj = config.colors[Math.floor(Math.random() * config.colors.length)];
    let colorObj;
    
    if (isCongruent) {
        colorObj = wordObj;
    } else {
        let options = config.colors.filter(c => c.id !== wordObj.id);
        colorObj = options[Math.floor(Math.random() * options.length)];
    }

    return {
        word: wordObj.word,
        wordId: wordObj.id,
        colorHex: colorObj.hex,
        colorId: colorObj.id,
        isCongruent,
        correctAnswer: colorObj.id
    };
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// --- Experiment Logic ---

function startPractice() {
    const pId = ui.participantId.value.trim();
    if (!pId) {
        alert('실험을 시작하기 전에 참가자 ID를 입력해 주세요.');
        ui.participantId.focus();
        return;
    }
    
    state.participantId = pId;
    state.startTime = new Date();
    state.phase = 'practice';
    state.trials = generateTrials(config.practiceTrials, false);
    state.currentTrialIndex = 0;
    state.results = [];
    
    ui.phaseIndicator.textContent = '연습 라운드';
    ui.phaseIndicator.className = 'phase-badge practice-mode';
    
    showScreen('experiment');
    runNextTrial();
}

function startMain() {
    state.phase = 'main';
    state.trials = generateTrials(config.mainTrials, true);
    state.currentTrialIndex = 0;
    
    ui.phaseIndicator.textContent = '본 실험';
    ui.phaseIndicator.className = 'phase-badge main-mode';
    
    showScreen('experiment');
    runNextTrial();
}

function updateProgress() {
    const total = state.trials.length;
    const current = state.currentTrialIndex + 1;
    ui.trialCounter.textContent = `${current > total ? total : current} / ${total}`;
    ui.progressBar.style.width = `${(state.currentTrialIndex / total) * 100}%`;
}

function runNextTrial() {
    if (state.currentTrialIndex >= state.trials.length) {
        finishPhase();
        return;
    }

    updateProgress();
    ui.word.classList.remove('visible');
    ui.word.classList.add('hidden');
    ui.fixation.classList.remove('hidden');
    ui.fixation.classList.add('visible');
    ui.feedback.classList.remove('show');
    ui.feedback.classList.add('hidden');
    
    clearTimeout(state.timeoutId);
    
    state.timeoutId = setTimeout(() => {
        ui.fixation.classList.remove('visible');
        ui.fixation.classList.add('hidden');
        state.timeoutId = setTimeout(() => {
            showStimulus();
        }, config.blankDuration);
    }, config.fixationDuration);
}

function showStimulus() {
    const trial = state.trials[state.currentTrialIndex];
    ui.word.textContent = trial.word;
    ui.word.style.color = trial.colorHex;
    ui.word.classList.remove('hidden');
    ui.word.classList.add('visible');
    
    state.currentTrialTime = performance.now();
    state.isWaitingForInput = true;
}

function handleInput(colorId) {
    if (!state.isWaitingForInput) return;
    
    const rt = performance.now() - state.currentTrialTime;
    state.isWaitingForInput = false;
    
    const trial = state.trials[state.currentTrialIndex];
    const isCorrect = colorId === trial.correctAnswer;
    
    // Record both practice and main trials
    state.results.push({
        phaseName: state.phase === 'practice' ? '연습' : '본실험',
        trialNum: state.currentTrialIndex + 1,
        word: trial.word,
        color: trial.colorId,
        isCongruent: trial.isCongruent,
        response: colorId,
        isCorrect: isCorrect,
        rt: Math.round(rt)
    });

    // Show feedback for both practice and main phases
    showFeedback(isCorrect);
}

function showFeedback(isCorrect) {
    ui.word.classList.remove('visible');
    ui.word.classList.add('hidden');
    
    ui.feedback.textContent = isCorrect ? '정답!' : '오답!';
    ui.feedback.className = `feedback-msg show ${isCorrect ? 'correct' : 'incorrect'}`;
    
    state.timeoutId = setTimeout(() => {
        ui.feedback.classList.remove('show');
        ui.feedback.classList.add('hidden');
        state.currentTrialIndex++;
        runNextTrial();
    }, config.feedbackDuration);
}

function finishPhase() {
    if (state.phase === 'practice') {
        showScreen('interstitial');
    } else {
        calculateAndShowResults();
        showScreen('end');
    }
}

// --- Results Handling ---

function calculateAndShowResults() {
    // Only use main phase trials for result screen summarization
    const trials = state.results.filter(t => t.phaseName === '본실험');
    if (trials.length === 0) return;

    const correct = trials.filter(t => t.isCorrect);
    const accuracy = Math.round((correct.length / trials.length) * 100);
    
    // Average RT for correct trials
    const getAvgRt = (subset) => {
        if (subset.length === 0) return 0;
        const sum = subset.reduce((acc, t) => acc + t.rt, 0);
        return Math.round(sum / subset.length);
    };

    const totalRt = getAvgRt(correct);
    const congruentTrials = correct.filter(t => t.isCongruent);
    const incongruentTrials = correct.filter(t => !t.isCongruent);
    
    const congRt = getAvgRt(congruentTrials);
    const inconRt = getAvgRt(incongruentTrials);

    // Store summary for CSV export
    state.summary = { accuracy, totalRt, congRt, inconRt };

    // Update UI
    document.getElementById('total-acc').textContent = `${accuracy}%`;
    document.getElementById('total-rt').textContent = `${totalRt}ms`;
    document.getElementById('congruent-rt').textContent = `${congRt}ms`;
    document.getElementById('incongruent-rt').textContent = `${inconRt}ms`;
}

function downloadCSV() {
    ui.downloadCsvBtn.textContent = "전송 중...";
    ui.downloadCsvBtn.disabled = true;

    const dt = state.startTime || new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dateStr = `${dt.getFullYear()}/${pad(dt.getMonth()+1)}/${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

    // Flatten rows for Sheets
    const rows = state.results.map(row => {
        const condition = row.isCongruent ? 'Congruent' : 'Incongruent';
        const isCorrect = row.isCorrect ? '1' : '0';
        return [
            state.participantId,
            dateStr,
            state.summary?.accuracy || 0,
            state.summary?.totalRt || 0,
            state.summary?.congRt || 0,
            state.summary?.inconRt || 0,
            row.phaseName,
            row.trialNum,
            row.word,
            row.color,
            condition,
            row.response,
            isCorrect,
            row.rt
        ];
    });

    // Check if running inside Google Apps Script HTML Service
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
            .withSuccessHandler(() => {
                alert("구글 스프레드시트에 결과가 성공적으로 전송되었습니다!");
                ui.downloadCsvBtn.textContent = "결과 전송 완료";
            })
            .withFailureHandler((err) => {
                alert("전송 실패: " + err.message);
                ui.downloadCsvBtn.textContent = "결과 보내기";
                ui.downloadCsvBtn.disabled = false;
            })
            .saveDataToSheet(rows);
    } else {
        // Fallback: Download Local CSV
        alert("구글 앱스크립트 환경이 아닙니다. 로컬 CSV 파일로 결과를 다운로드합니다.");
        downloadLocalCSV(dateStr);
        ui.downloadCsvBtn.textContent = "결과 보내기";
        ui.downloadCsvBtn.disabled = false;
    }
}

function downloadLocalCSV(dateStr) {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for excel UTF-8
    
    csvContent += `참가자 ID,${state.participantId}\n`;
    csvContent += `실험 시작 일시,${dateStr}\n`;
    if (state.summary) {
        csvContent += `전체 정확도,${state.summary.accuracy}%\n`;
        csvContent += `평균 반응시간,${state.summary.totalRt}ms\n`;
        csvContent += `일치조건 반응시간,${state.summary.congRt}ms\n`;
        csvContent += `불일치조건 반응시간,${state.summary.inconRt}ms\n`;
    }
    csvContent += `\n`; 
    
    const headers = ['Phase', 'Trial', 'Word', 'Color', 'Condition', 'Response', 'Correct', 'RT(ms)'];
    csvContent += headers.join(',') + '\n';
    
    state.results.forEach(row => {
        const condition = row.isCongruent ? 'Congruent' : 'Incongruent';
        const isCorrect = row.isCorrect ? '1' : '0';
        csvContent += `${row.phaseName},${row.trialNum},${row.word},${row.color},${condition},${row.response},${isCorrect},${row.rt}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dt = state.startTime || new Date();
    const pad = n => n.toString().padStart(2, '0');
    const filenameTime = `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}`;
    link.setAttribute("download", `stroop_${state.participantId}_${filenameTime}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Start app
document.addEventListener('DOMContentLoaded', init);
