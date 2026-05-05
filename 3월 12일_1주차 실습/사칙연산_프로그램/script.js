document.addEventListener("DOMContentLoaded", () => {
    const menuScreen = document.getElementById("menu-screen");
    const gameScreen = document.getElementById("game-screen");
    const resultScreen = document.getElementById("result-screen");
    
    const opBtns = document.querySelectorAll(".op-btn");
    const backBtn = document.getElementById("back-btn");
    const homeBtn = document.getElementById("home-btn");
    const submitBtn = document.getElementById("submit-btn");
    
    const answerInput = document.getElementById("answer-input");
    const problemText = document.getElementById("problem-text");
    const operationTitle = document.getElementById("operation-title");
    const progressDisplay = document.getElementById("progress");
    const feedbackDisplay = document.getElementById("feedback");

    const TOTAL_TRIALS = 20;
    
    let currentOperation = "";
    let correctAnswer = 0;
    
    // Stats Tracking
    let currentTrial = 0;
    let correctCount = 0;
    let errorCount = 0;
    let problemStartTime = 0;
    let times = [];

    const operations = {
        add: { title: "더하기", symbol: "+" },
        sub: { title: "빼기", symbol: "-" },
        mul: { title: "곱하기", symbol: "×" },
        div: { title: "나누기", symbol: "÷" }
    };

    // Events
    opBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            currentOperation = btn.getAttribute("data-op");
            startGame();
        });
    });

    backBtn.addEventListener("click", () => {
        gameScreen.classList.remove("active");
        menuScreen.classList.add("active");
    });
    
    homeBtn.addEventListener("click", () => {
        resultScreen.classList.remove("active");
        menuScreen.classList.add("active");
    });

    submitBtn.addEventListener("click", checkAnswer);
    answerInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            checkAnswer();
        }
    });

    function startGame() {
        currentTrial = 0;
        correctCount = 0;
        errorCount = 0;
        times = [];
        
        operationTitle.textContent = operations[currentOperation].title;
        feedbackDisplay.classList.remove("show");
        
        menuScreen.classList.remove("active");
        resultScreen.classList.remove("active");
        gameScreen.classList.add("active");
        
        loadNextProblem();
    }

    function loadNextProblem() {
        currentTrial++;
        if (currentTrial > TOTAL_TRIALS) {
            endGame();
            return;
        }

        progressDisplay.textContent = currentTrial;
        answerInput.value = "";
        answerInput.readOnly = false;
        answerInput.focus();
        feedbackDisplay.classList.remove("show");
        feedbackDisplay.className = "feedback";

        let num1, num2;

        if (currentOperation === "add") {
            num1 = getRandomInt(1, 200);
            num2 = getRandomInt(1, 200);
            correctAnswer = num1 + num2;
        } else if (currentOperation === "sub") {
            let a = getRandomInt(1, 200);
            let b = getRandomInt(1, 200);
            num1 = Math.max(a, b);
            num2 = Math.min(a, b);
            correctAnswer = num1 - num2;
        } else if (currentOperation === "mul") {
            num1 = getRandomInt(1, 99);
            num2 = getRandomInt(1, 99);
            correctAnswer = num1 * num2;
        } else if (currentOperation === "div") {
            let divisor = getRandomInt(1, 99);
            let quotient = getRandomInt(1, 99);
            num1 = divisor * quotient;
            num2 = divisor;
            correctAnswer = quotient;
        }

        problemText.textContent = `${num1} ${operations[currentOperation].symbol} ${num2}`;
        problemStartTime = Date.now();
    }

    function checkAnswer() {
        if (answerInput.readOnly || answerInput.value.trim() === "") return;

        const userAnswer = parseInt(answerInput.value, 10);
        if (isNaN(userAnswer)) {
            answerInput.focus();
            return;
        }

        const timeTaken = (Date.now() - problemStartTime) / 1000; // in seconds
        times.push(timeTaken);

        // 정답 오답 상관없이 1번 제출하면 기록 후 넘어감. (블록 당 20문제)
        answerInput.readOnly = true;

        if (userAnswer === correctAnswer) {
            correctCount++;
            showFeedback(true);
        } else {
            errorCount++;
            showFeedback(false);
        }

        // 0.6초 뒤 다음 문제
        setTimeout(loadNextProblem, 600);
    }

    function showFeedback(isCorrect) {
        feedbackDisplay.className = "feedback show";
        if (isCorrect) {
            feedbackDisplay.textContent = "정답입니다! 🎉";
            feedbackDisplay.classList.add("correct");
        } else {
            feedbackDisplay.textContent = `틀렸습니다! 정답은 ${correctAnswer} 💥`;
            feedbackDisplay.classList.add("wrong");
        }
    }

    function getTimestampName() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const MM = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${yyyy}-${MM}-${dd}-${hh}-${mm}-${ss}`;
    }

    function endGame() {
        gameScreen.classList.remove("active");
        resultScreen.classList.add("active");

        const errorRate = (errorCount / TOTAL_TRIALS) * 100;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

        // Display results
        document.getElementById("res-error-rate").textContent = `${errorRate.toFixed(1)}%`;
        document.getElementById("res-avg-time").textContent = `${avgTime.toFixed(2)}s`;
        document.getElementById("res-max-time").textContent = `${maxTime.toFixed(2)}s`;
        document.getElementById("res-min-time").textContent = `${minTime.toFixed(2)}s`;

        saveAndShowRanking(errorRate, avgTime, maxTime, minTime);
    }

    function saveAndShowRanking(errorRate, avgTime, maxTime, minTime) {
        const playerName = getTimestampName();
        const record = {
            name: playerName,
            operation: currentOperation,
            errorRate: errorRate,
            avgTime: avgTime,
            maxTime: maxTime,
            minTime: minTime,
            correctCount: correctCount
        };

        // 로컬스토리지에서 가져오기
        let rankings = JSON.parse(localStorage.getItem("mathGameRankings")) || [];
        rankings.push(record);

        // 정렬: 1순위 낮은 오답률, 2순위 빠른 평균 시간
        rankings.sort((a, b) => {
            if (a.errorRate !== b.errorRate) {
                return a.errorRate - b.errorRate;
            }
            return a.avgTime - b.avgTime;
        });

        // 다시 저장
        localStorage.setItem("mathGameRankings", JSON.stringify(rankings));

        // UI 렌더링
        document.getElementById("ranking-op-name").textContent = operations[currentOperation].title;
        const tbody = document.getElementById("ranking-tbody");
        tbody.innerHTML = "";

        // 해당 연산의 랭킹만 필터
        const filteredRankings = rankings.filter(r => r.operation === currentOperation);

        filteredRankings.slice(0, 10).forEach((r, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td style="font-size: 0.8rem;">${r.name}</td>
                <td>${r.errorRate.toFixed(1)}%</td>
                <td>${r.avgTime.toFixed(2)}s</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
});
