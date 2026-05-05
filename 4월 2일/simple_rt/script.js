/**
 * Simple RT (Reaction Time) Task
 * 단순 반응시간 과제
 *
 * 구성: 연습 5회 + 본 시행 20회
 * 자극: 빨간 원  |  반응: 스페이스바
 */

// ─── Device Detection ────────────────────────────────────────────
function detectDevice() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
}
const DEVICE = detectDevice();

// ─── Configuration ───────────────────────────────────────────────
const CONFIG = {
    practiceTotalTrials: 5,
    mainTotalTrials: 20,
    fixationDurationRange: [500, 1500],   // ms – 고정점 지속 시간 (랜덤)
    maxResponseTime: 1500,                 // ms – 최대 허용 반응시간
    feedbackDuration: 800,                 // ms
    interTrialInterval: 500,               // ms – 시행 간 공백
};

// ─── State ────────────────────────────────────────────────────────
let participantId = '';
let phase = 'practice'; // 'practice' | 'main'
let currentTrial = 0;
let totalTrials = CONFIG.practiceTotalTrials;
let allResults = [];
let mainResults = [];
let stimulusOnsetTime = 0;
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
    result:      document.getElementById('result-screen'),
};

const els = {
    participantId: document.getElementById('participant-id'),
    startBtn:      document.getElementById('start-btn'),
    practiceBtn:   document.getElementById('practice-btn'),
    mainBtn:       document.getElementById('main-btn'),
    excelBtn:      document.getElementById('excel-btn'),
    retryBtn:      document.getElementById('retry-btn'),
    phaseLabel:    document.getElementById('phase-label'),
    trialCounter:  document.getElementById('trial-counter'),
    fixation:      document.getElementById('fixation'),
    stimulus:      document.getElementById('stimulus'),
    feedback:      document.getElementById('feedback'),
    feedbackText:  document.getElementById('feedback-text'),
    blank:         document.getElementById('blank'),
    resultSummary: document.getElementById('result-summary'),
    chart:         document.getElementById('rt-chart'),
};

// ─── Screen Management ───────────────────────────────────────────
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ─── Random integer in [min, max] ─────────────────────────────────
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Show / Hide stimulus areas ──────────────────────────────────
function showArea(id) {
    ['fixation', 'stimulus', 'feedback', 'blank'].forEach(a => {
        els[a].style.display = a === id ? 'flex' : 'none';
    });
}

// ─── Trial Flow ──────────────────────────────────────────────────
function startTrial() {
    currentTrial++;
    updateTrialInfo();
    falseStart = false;
    awaitingResponse = false;

    // 1) 고정점 (+)
    showArea('fixation');

    currentFixDur = randInt(...CONFIG.fixationDurationRange);

    trialTimeout = setTimeout(() => {
        // 2) 자극 (빨간 원)
        showArea('stimulus');
        stimulusOnsetTime = performance.now();
        awaitingResponse = true;

        // 최대 응답 시간 초과 처리
        trialTimeout = setTimeout(() => {
            if (awaitingResponse) {
                awaitingResponse = false;
                recordResult(CONFIG.maxResponseTime, 'too_slow', 'none', 'X', currentFixDur);
                showFeedback('너무 느립니다!', 'too-slow');
            }
        }, CONFIG.maxResponseTime);
    }, currentFixDur);
}

function updateTrialInfo() {
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
    const row = {
        participant_ID: participantId,
        trial_index: currentTrial,
        condition: phase === 'practice' ? '연습' : '본 시행',
        stimulus: '빨간 원',
        participant_response: response,
        accuracy: accuracy,
        RT_ms: rt ?? '',
        foreperiod_ms: foreperiod ?? '',
        device: DEVICE,
    };
    allResults.push(row);
    if (phase === 'main') {
        mainResults.push({ trial: currentTrial, rt: rt, type: type });
    }
}

// ─── Key Handling ────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();

    // 실험 화면에서만 반응 처리
    if (!screens.experiment.classList.contains('active')) return;

    if (awaitingResponse) {
        // 정상 반응
        awaitingResponse = false;
        clearTimeout(trialTimeout);
        const rt = Math.round(performance.now() - stimulusOnsetTime);
        recordResult(rt, 'hit', 'spacebar', 1, currentFixDur);

        if (phase === 'practice') {
            showFeedback(`${rt} ms`, 'correct');
        } else {
            // 본 시행: RT 피드백 없이 다음 시행으로
            showArea('blank');
            setTimeout(nextTrial, CONFIG.interTrialInterval);
        }
    } else if (!falseStart) {
        // 자극 나타나기 전에 반응
        falseStart = true;
        clearTimeout(trialTimeout);
        recordResult(null, 'false_start', 'spacebar', 0, '');
        showFeedback('너무 빨라요!', 'false-start');
    }
});

// ─── Results ─────────────────────────────────────────────────────
function showResults() {
    showScreen('result');

    const hits = mainResults.filter(r => r.type === 'hit');
    const falseStarts = mainResults.filter(r => r.type === 'false_start').length;
    const tooSlows = mainResults.filter(r => r.type === 'too_slow').length;

    const meanRT = hits.length ? Math.round(hits.reduce((s, r) => s + r.rt, 0) / hits.length) : '-';
    const minRT = hits.length ? Math.min(...hits.map(r => r.rt)) : '-';
    const maxRT = hits.length ? Math.max(...hits.map(r => r.rt)) : '-';
    const accuracy = Math.round((hits.length / CONFIG.mainTotalTrials) * 100);

    els.resultSummary.innerHTML = `
        <div class="stat-box">
            <div class="stat-label">평균 반응시간</div>
            <div class="stat-value accent">${meanRT} ms</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">정확도</div>
            <div class="stat-value success">${accuracy}%</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">최소 RT</div>
            <div class="stat-value">${minRT} ms</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">최대 RT</div>
            <div class="stat-value">${maxRT} ms</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">오반응 (False Start)</div>
            <div class="stat-value">${falseStarts}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">무응답 (Too Slow)</div>
            <div class="stat-value">${tooSlows}</div>
        </div>
    `;

    drawChart(hits);
}

function drawChart(hits) {
    const ctx = els.chart.getContext('2d');
    new Chart(ctx, {
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
                pointBackgroundColor: '#ff4d6d',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 40, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: (items) => `시행 ${items[0].label}`,
                        label: (item) => `RT: ${item.raw} ms`,
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: '시행 번호', color: '#888' },
                    ticks: { color: '#888' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                },
                y: {
                    title: { display: true, text: '반응시간 (ms)', color: '#888' },
                    ticks: { color: '#888' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    beginAtZero: false,
                }
            }
        }
    });
}

// ─── Excel Export ──────────────────────────────────────────────────
function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(allResults);

    // 열 너비 자동 조절
    ws['!cols'] = [
        { wch: 16 }, // participant_ID
        { wch: 12 }, // trial_index
        { wch: 10 }, // condition
        { wch: 10 }, // stimulus
        { wch: 22 }, // participant_response
        { wch: 10 }, // accuracy
        { wch: 10 }, // RT_ms
        { wch: 14 }, // foreperiod_ms
        { wch: 10 }, // device
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `simple_rt_${participantId}.xlsx`);
}

// ─── Event Listeners ──────────────────────────────────────────────
els.startBtn.addEventListener('click', () => {
    const id = els.participantId.value.trim();
    if (!id) {
        els.participantId.focus();
        els.participantId.style.borderColor = 'var(--error)';
        return;
    }
    participantId = id;
    showScreen('instruction');
});

els.participantId.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.startBtn.click();
});

els.practiceBtn.addEventListener('click', () => {
    phase = 'practice';
    currentTrial = 0;
    totalTrials = CONFIG.practiceTotalTrials;
    showScreen('experiment');
    startTrial();
});

els.mainBtn.addEventListener('click', () => {
    phase = 'main';
    currentTrial = 0;
    totalTrials = CONFIG.mainTotalTrials;
    mainResults = [];
    showScreen('experiment');
    startTrial();
});

els.excelBtn.addEventListener('click', exportExcel);

els.retryBtn.addEventListener('click', () => {
    phase = 'practice';
    currentTrial = 0;
    totalTrials = CONFIG.practiceTotalTrials;
    allResults = [];
    mainResults = [];
    showScreen('instruction');
});
