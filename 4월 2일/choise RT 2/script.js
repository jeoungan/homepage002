/**
 * Choice RT (Reaction Time) Task
 * 선택 반응시간 과제 (4블록)
 */

// ─── Device Detection ────────────────────────────────────────────
function detectDevice() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
}
const DEVICE = detectDevice();
const isMobileTouch = DEVICE !== 'desktop' || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

// ─── Configuration ───────────────────────────────────────────────
const CONFIG = {
    practiceTotalTrials: 5,
    mainTotalTrials: 40,
    fixationDurationRange: [500, 1500],
    maxResponseTime: 1500,
    feedbackDuration: 800,
    interTrialInterval: 500,
};

const BLOCKS = [
    {
        id: 1,
        name: '블록 1',
        description: '자극: 왼쪽 화살표 (1개)<br>반응: <kbd>←</kbd> 또는 <kbd>A</kbd>',
        stimuli: [
            { id: 'left', name: '왼쪽 화살표', keys: ['ArrowLeft', 'KeyA'], keyLabel: '←(A)', icon: '←' }
        ]
    },
    {
        id: 2,
        name: '블록 2',
        description: '자극: 2개<br>왼쪽 화살표 → <kbd>←</kbd> (A)<br>오른쪽 화살표 → <kbd>→</kbd> (D)',
        stimuli: [
            { id: 'left', name: '왼쪽 화살표', keys: ['ArrowLeft', 'KeyA'], keyLabel: '←(A)', icon: '←' },
            { id: 'right', name: '오른쪽 화살표', keys: ['ArrowRight', 'KeyD'], keyLabel: '→(D)', icon: '→' }
        ]
    },
    {
        id: 3,
        name: '블록 3',
        description: '자극: 3개<br>왼쪽 → <kbd>←</kbd> (A)<br>오른쪽 → <kbd>→</kbd> (D)<br>위쪽 → <kbd>↑</kbd> (W)',
        stimuli: [
            { id: 'left', name: '왼쪽 화살표', keys: ['ArrowLeft', 'KeyA'], keyLabel: '←(A)', icon: '←' },
            { id: 'right', name: '오른쪽 화살표', keys: ['ArrowRight', 'KeyD'], keyLabel: '→(D)', icon: '→' },
            { id: 'up', name: '위쪽 화살표', keys: ['ArrowUp', 'KeyW'], keyLabel: '↑(W)', icon: '↑' }
        ]
    },
    {
        id: 4,
        name: '블록 4',
        description: '자극: 4개<br>왼쪽 → <kbd>←</kbd> (A)<br>오른쪽 → <kbd>→</kbd> (D)<br>위 → <kbd>↑</kbd> (W)<br>아래 → <kbd>↓</kbd> (S)',
        stimuli: [
            { id: 'left', name: '왼쪽 화살표', keys: ['ArrowLeft', 'KeyA'], keyLabel: '←(A)', icon: '←' },
            { id: 'right', name: '오른쪽 화살표', keys: ['ArrowRight', 'KeyD'], keyLabel: '→(D)', icon: '→' },
            { id: 'up', name: '위쪽 화살표', keys: ['ArrowUp', 'KeyW'], keyLabel: '↑(W)', icon: '↑' },
            { id: 'down', name: '아래쪽 화살표', keys: ['ArrowDown', 'KeyS'], keyLabel: '↓(S)', icon: '↓' }
        ]
    }
];

// ─── State ────────────────────────────────────────────────────────
let participantId = '';
let currentBlockIdx = 0;
let phase = 'practice'; // 'practice' | 'main'
let currentTrial = 0;
let totalTrials = CONFIG.practiceTotalTrials;
let allResults = [];
let mainResults = []; // 본시행 결과 전체 저장

let trialSequence = [];
let currentStimulus = null;
let stimulusOnsetTime = 0;
let currentPhaseState = 'idle'; // 'fixation', 'stimulus', 'feedback', 'blank'
let awaitingResponse = false;
let falseStart = false;
let trialTimeout = null;
let currentFixDur = 0;

// ─── DOM References ──────────────────────────────────────────────
const screens = {
    id:          document.getElementById('id-screen'),
    instruction: document.getElementById('instruction-screen'),
    experiment:  document.getElementById('experiment-screen'),
    practiceEnd: document.getElementById('practice-end-screen'),
    blockEnd:    document.getElementById('block-end-screen'),
    result:      document.getElementById('result-screen'),
};

const els = {
    participantId:   document.getElementById('participant-id'),
    levelSelect:     document.getElementById('level-select'),
    startBtn:        document.getElementById('start-btn'),
    practiceBtn:     document.getElementById('practice-btn'),
    mainBtn:         document.getElementById('main-btn'),
    nextBlockBtn:    document.getElementById('next-block-btn'),
    retryBtn:        document.getElementById('retry-btn'),
    nextLevelBtn:    document.getElementById('next-level-btn'),
    
    instructionTitle:document.getElementById('instruction-title'),
    instructionBody: document.getElementById('instruction-body'),
    
    blockLabel:      document.getElementById('block-label'),
    phaseLabel:      document.getElementById('phase-label'),
    trialCounter:    document.getElementById('trial-counter'),
    
    fixation:        document.getElementById('fixation'),
    stimulus:        document.getElementById('stimulus'),
    stimulusIcon:    document.getElementById('stimulus-icon'),
    feedback:        document.getElementById('feedback'),
    feedbackText:    document.getElementById('feedback-text'),
    blank:           document.getElementById('blank'),
    mobileControls:  document.getElementById('mobile-controls'),
    
    resultSummary:   document.getElementById('result-summary'),
    chart:           document.getElementById('rt-chart'),
};

// ─── Screen Management ───────────────────────────────────────────
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ─── Utility ──────────────────────────────────────────────────────
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSequence(phaseType) {
    const block = BLOCKS[currentBlockIdx];
    const seq = [];
    
    if (phaseType === 'practice') {
        for (let i = 0; i < CONFIG.practiceTotalTrials; i++) {
            seq.push(block.stimuli[randInt(0, block.stimuli.length - 1)]);
        }
    } else {
        const total = CONFIG.mainTotalTrials;
        const stimCount = block.stimuli.length;
        const perStim = Math.floor(total / stimCount);
        const remainder = total % stimCount;
        
        // 균등하게 배분
        block.stimuli.forEach(stim => {
            for (let i = 0; i < perStim; i++) {
                seq.push(stim);
            }
        });
        
        // 남은 시행은 무작위로 추가 (ex. 3블록의 경우 1개)
        for (let i = 0; i < remainder; i++) {
            seq.push(block.stimuli[randInt(0, stimCount - 1)]);
        }
        
        // 순서 셔플 (Fisher-Yates 알고리즘)
        for (let i = seq.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [seq[i], seq[j]] = [seq[j], seq[i]];
        }
    }
    return seq;
}

function showArea(id) {
    currentPhaseState = id;
    ['fixation', 'stimulus', 'feedback', 'blank'].forEach(a => {
        els[a].style.display = a === id ? 'flex' : 'none';
    });
}

function startBlock() {
    const block = BLOCKS[currentBlockIdx];
    els.instructionTitle.textContent = `${block.name} 안내`;
    
    let instructionHtml = `<div class="instruction-step"><div class="step-icon">👁️</div><p>중앙의 <strong>+</strong> 표시에 시선을 고정하세요.</p></div>`;
    instructionHtml += `<div class="instruction-step"><div class="step-icon">🎨</div><p>${block.description}</p></div>`;
    instructionHtml += `<div class="instruction-step"><div class="step-icon">⚡</div><p>최대한 빠르고 정확하게 누르세요.</p></div>`;
    
    els.instructionBody.innerHTML = instructionHtml;
    
    renderMobileControls();
    showScreen('instruction');
}

function renderMobileControls() {
    if (!isMobileTouch) return;
    
    els.mobileControls.innerHTML = '';
    const block = BLOCKS[currentBlockIdx];
    
    block.stimuli.forEach(stim => {
        const btn = document.createElement('div');
        btn.className = 'mobile-btn';
        btn.dataset.id = stim.id;
        btn.textContent = stim.icon;
        
        const interactionEvent = (e) => {
            e.preventDefault();
            handleInput(stim.id);
        };
        
        btn.addEventListener('touchstart', interactionEvent, {passive: false});
        btn.addEventListener('mousedown', interactionEvent);
        
        els.mobileControls.appendChild(btn);
    });
    
    els.mobileControls.style.display = 'grid';
}

// ─── Trial Flow ──────────────────────────────────────────────────
function startTrial() {
    currentTrial++;
    updateTrialInfo();
    falseStart = false;
    awaitingResponse = false;
    currentStimulus = null;

    showArea('fixation');
    currentFixDur = randInt(...CONFIG.fixationDurationRange);

    // 미리 생성된 시퀀스에서 이번 시행의 자극 가져오기
    currentStimulus = trialSequence[currentTrial - 1];

    trialTimeout = setTimeout(() => {
        // 자극 표시
        els.stimulusIcon.className = `stimulus-icon ${currentStimulus.id}`;
        els.stimulusIcon.textContent = currentStimulus.icon;
        showArea('stimulus');
        stimulusOnsetTime = performance.now();
        awaitingResponse = true;

        // 최대 응답 시간 초과 처리
        trialTimeout = setTimeout(() => {
            if (awaitingResponse) {
                awaitingResponse = false;
                recordResult(CONFIG.maxResponseTime, 'too_slow', 'none', 0, currentFixDur);
                showFeedback('너무 느립니다!', 'too-slow');
            }
        }, CONFIG.maxResponseTime);
    }, currentFixDur);
}

function updateTrialInfo() {
    els.blockLabel.textContent = `블록 ${currentBlockIdx + 1}`;
    els.phaseLabel.textContent = phase === 'practice' ? '연습' : '본 시행';
    els.trialCounter.textContent = `${currentTrial} / ${totalTrials}`;
}

function showFeedback(text, cls) {
    els.feedbackText.textContent = text;
    els.feedbackText.className = 'feedback-text ' + cls;
    showArea('feedback');

    setTimeout(() => {
        showArea('blank');
        setTimeout(nextTrial, CONFIG.interTrialInterval);
    }, CONFIG.feedbackDuration);
}

function nextTrial() {
    if (currentTrial >= totalTrials) {
        if (phase === 'practice') {
            showScreen('practiceEnd');
        } else {
            showResults();
        }
        return;
    }
    startTrial();
}

function recordResult(rt, type, response, accuracy, foreperiod) {
    const block = BLOCKS[currentBlockIdx];
    const row = {
        participant_ID: participantId,
        block: block.name,
        phase: phase === 'practice' ? '연습' : '본 시행',
        trial_index: currentTrial,
        condition: `${block.stimuli.length}_Choice`,
        stimulus: currentStimulus ? currentStimulus.icon : 'none',
        correct_response: currentStimulus ? currentStimulus.icon : 'none',
        participant_response: response,
        accuracy: accuracy,
        RT_ms: rt ?? '',
        foreperiod_ms: foreperiod ?? '',
        type: type,
        device: DEVICE,
    };
    allResults.push(row);
    if (phase === 'main') {
        const globalTrial = mainResults.length + 1;
        mainResults.push({ 
            trial: globalTrial, 
            block: block.name, 
            rt: rt, 
            type: type, 
            accuracy: accuracy, 
            condition: block.stimuli.length 
        });
    }
}

// ─── Input Handling (Keyboard & Touch) ───────────────────────────
function handleInput(inputId) {
    if (!screens.experiment.classList.contains('active')) return;
    
    // 피드백이나 시행 사이 대기(blank) 화면일 때는 클릭/키 입력을 무시하여 연타 방지
    if (currentPhaseState === 'feedback' || currentPhaseState === 'blank') {
        return;
    }
    
    const block = BLOCKS[currentBlockIdx];
    const allowedIds = block.stimuli.map(s => s.id);

    // 화면에 +만 떠있을 때(fixation) 누르면 너무 빠르다고 판정 (false_start)
    if (currentPhaseState === 'fixation') {
        if (allowedIds.includes(inputId) && !falseStart) {
            falseStart = true;
            clearTimeout(trialTimeout);
            const pressedStim = block.stimuli.find(s => s.id === inputId);
            const responseLabel = pressedStim ? pressedStim.icon : inputId;
            recordResult(null, 'false_start', responseLabel, 0, '');
            showFeedback('너무 빨라요!', 'false-start');
        }
        return;
    }

    // 자극이 떠있는 화면일 때 정상 응답
    if (currentPhaseState === 'stimulus' && awaitingResponse) {
        if (allowedIds.includes(inputId)) {
            awaitingResponse = false;
            clearTimeout(trialTimeout);
            const rt = Math.round(performance.now() - stimulusOnsetTime);
            const isCorrect = (currentStimulus.id === inputId);
            const accuracy = isCorrect ? 1 : 0;
            const type = isCorrect ? 'hit' : 'miss';
            
            const pressedStim = block.stimuli.find(s => s.id === inputId);
            const responseLabel = pressedStim ? pressedStim.icon : inputId;

            recordResult(rt, type, responseLabel, accuracy, currentFixDur);

            if (phase === 'practice') {
                if (isCorrect) {
                    showFeedback(`${rt} ms`, 'correct');
                } else {
                    showFeedback('오답!', 'false-start');
                }
            } else {
                // 본 시행은 오답일 때만 피드백 노출
                if (!isCorrect) {
                     showFeedback('오답!', 'false-start');
                } else {
                     showArea('blank');
                     setTimeout(nextTrial, CONFIG.interTrialInterval);
                }
            }
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (!screens.experiment.classList.contains('active')) return;
    const block = BLOCKS[currentBlockIdx];
    const matchedStim = block.stimuli.find(s => s.keys.includes(e.code));
    if (matchedStim) {
        e.preventDefault();
        handleInput(matchedStim.id);
    }
});

// ─── Results ─────────────────────────────────────────────────────
function showResults() {
    showScreen('result');

    const hits = mainResults.filter(r => r.type === 'hit');
    const misses = mainResults.filter(r => r.type === 'miss').length;
    const falseStarts = mainResults.filter(r => r.type === 'false_start').length;
    const tooSlows = mainResults.filter(r => r.type === 'too_slow').length;

    const meanRT = hits.length ? Math.round(hits.reduce((s, r) => s + r.rt, 0) / hits.length) : '-';
    const accuracy = mainResults.length ? Math.round((hits.length / mainResults.length) * 100) : 0;

    els.resultSummary.innerHTML = `
        <div class="stat-box">
            <div class="stat-label">진행 레벨</div>
            <div class="stat-value">레벨 ${currentBlockIdx + 1}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">평균 RT</div>
            <div class="stat-value accent">${meanRT} ms</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">정확도</div>
            <div class="stat-value success">${accuracy}%</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">오반응 / 무응답</div>
            <div class="stat-value" style="font-size: 1.2rem; margin-top: 10px;">${misses + falseStarts + tooSlows}회</div>
        </div>
    `;

    drawChart(hits);

    if (currentBlockIdx < BLOCKS.length - 1) {
        els.nextLevelBtn.textContent = '결과 보내고 다음 레벨가기';
    } else {
        els.nextLevelBtn.textContent = '결과 보내고 홈으로';
    }
}

function drawChart(hits) {
    if (window.myChart) { // 기존 차트가 있다면 파기
        window.myChart.destroy();
    }
    const ctx = els.chart.getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hits.map(r => r.trial),
            datasets: [{
                label: '반응시간 (ms)',
                data: hits.map(r => r.rt),
                borderColor: '#ff4d6d',
                backgroundColor: 'rgba(255, 77, 109, 0.15)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: hits.map(r => {
                    if(r.condition === 1) return '#ff6b6b';
                    if(r.condition === 2) return '#6b8cff';
                    if(r.condition === 3) return '#6bff8c';
                    return '#ffeb6b';
                }),
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (item) => `RT: ${item.raw} ms (블록 ${hits[item.dataIndex].condition})`,
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: '전체 시행', color: '#888' }, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { title: { display: true, text: '반응시간 (ms)', color: '#888' }, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// ─── Excel Export ──────────────────────────────────────────────────
function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(allResults);
    ws['!cols'] = [
        { wch: 16 }, // ID
        { wch: 10 }, // block
        { wch: 10 }, // phase
        { wch: 12 }, // trial
        { wch: 12 }, // condition
        { wch: 12 }, // stimulus
        { wch: 16 }, // correct response
        { wch: 16 }, // part response
        { wch: 10 }, // accuracy
        { wch: 10 }, // RT
        { wch: 14 }, // foreperiod
        { wch: 12 }, // type
        { wch: 10 }, // device
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `choice_rt_${participantId}_Level${currentBlockIdx + 1}.xlsx`);
}

// ─── Event Listeners ──────────────────────────────────────────────
els.startBtn.addEventListener('click', () => {
    const consentCb = document.getElementById('modal-consent-checkbox');
    if (consentCb && !consentCb.checked) {
        alert('실험을 시작하려면 \'자세히 보기\'를 눌러 연구 동의서를 확인하고 동의해주세요.');
        return;
    }

    const id = els.participantId.value.trim();
    if (!id) {
        els.participantId.focus();
        els.participantId.style.borderColor = 'var(--error)';
        return;
    }
    participantId = id;
    currentBlockIdx = parseInt(els.levelSelect.value) - 1;
    allResults = [];
    mainResults = [];
    startBlock();
});

els.participantId.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.startBtn.click();
});

els.practiceBtn.addEventListener('click', () => {
    phase = 'practice';
    currentTrial = 0;
    totalTrials = CONFIG.practiceTotalTrials;
    trialSequence = generateSequence('practice');
    showScreen('experiment');
    startTrial();
});

els.mainBtn.addEventListener('click', () => {
    phase = 'main';
    currentTrial = 0;
    totalTrials = CONFIG.mainTotalTrials;
    trialSequence = generateSequence('main');
    showScreen('experiment');
    startTrial();
});

els.nextBlockBtn.addEventListener('click', () => {
    currentBlockIdx++;
    startBlock();
});

els.retryBtn.addEventListener('click', () => {
    allResults = [];
    mainResults = [];
    startBlock();
});

els.nextLevelBtn.addEventListener('click', () => {
    exportExcel(); // 현재 레벨 완료 시 결과 자동 저장
    if (currentBlockIdx < BLOCKS.length - 1) {
        currentBlockIdx++;
        allResults = [];
        mainResults = [];
        startBlock();
    } else {
        showScreen('id');
    }
});

// ─── Consent Modal Logic ──────────────────────────────────────────
const openConsentBtn = document.getElementById('open-consent-btn');
const closeConsentBtn = document.getElementById('close-modal-btn');
const consentModal = document.getElementById('consent-modal');
const consentCb = document.getElementById('modal-consent-checkbox');
const consentStatusText = document.getElementById('consent-status-text');

if (openConsentBtn && consentModal) {
    openConsentBtn.addEventListener('click', () => {
        consentModal.style.display = 'flex';
    });
}
if (closeConsentBtn && consentModal) {
    closeConsentBtn.addEventListener('click', () => {
        consentModal.style.display = 'none';
    });
}
if (consentCb && consentStatusText) {
    consentCb.addEventListener('change', (e) => {
        if (e.target.checked) {
            consentStatusText.textContent = '✅ 동의 완료';
            consentStatusText.style.color = 'var(--success)';
        } else {
            consentStatusText.textContent = '동의가 필요합니다.';
            consentStatusText.style.color = 'var(--error)';
        }
    });
}
