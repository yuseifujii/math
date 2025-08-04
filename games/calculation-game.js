// 計算チャレンジゲーム - Mt.MATH版
// Based on Prime Game System

// ゲーム状態管理
let score = 0;
let streak = 0;
let currentProblem = null;
let correctAnswer = 0;
let isGameActive = false;
let selectedLevel = null;
let gameTime = 60; // デフォルト時間
let timeLeft = 60;
let timer = null;
let questionsAnswered = 0;
let correctAnswers = 0;
let highScore = 0;
let gameStartTime = null;
let hintUsed = false;

// 難易度設定
const LEVEL_CONFIG = {
    easy: {
        time: 90,
        numberRange: { min: 1, max: 9 },
        operations: ['+', '-', '×'],
        scoreMultiplier: 1,
        hintPenalty: 5
    },
    medium: {
        time: 75,
        numberRange: { min: 10, max: 99 },
        operations: ['+', '-', '×', '÷'],
        scoreMultiplier: 1.5,
        hintPenalty: 8
    },
    hard: {
        time: 60,
        numberRange: { min: 10, max: 999 },
        operations: ['+', '-', '×', '÷'],
        scoreMultiplier: 2,
        hintPenalty: 10
    }
};

// DOM要素の取得
const scoreElement = document.getElementById('score');
const streakElement = document.getElementById('streak');
const timerElement = document.getElementById('timer');
const problemDisplay = document.getElementById('problem-display');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-btn');
const resultMessage = document.getElementById('result-message');
const hintBtn = document.getElementById('hint-btn');
const hintDisplay = document.getElementById('hint-display');
const startBtn = document.getElementById('start-btn');
const gameContent = document.querySelector('.game-content');
const levelSelection = document.getElementById('level-selection');
const levelButtons = document.querySelectorAll('.level-btn');
const gameContainer = document.getElementById('calculation-game');
const highScoreDisplay = document.getElementById('high-score-display');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const finalProblemsElement = document.getElementById('final-problems');
const finalAccuracyElement = document.getElementById('final-accuracy');
const gameOverMessage = document.getElementById('game-over-message');
const restartBtn = document.getElementById('restart-btn');

// ユーザー情報関連
const userInfoForm = document.getElementById('user-info-form');
const userAffiliationInput = document.getElementById('user-affiliation');
const userNicknameInput = document.getElementById('user-nickname');
const backToLevelBtn = document.getElementById('back-to-level-btn');
const affiliationCounter = document.getElementById('affiliation-counter');
const nicknameCounter = document.getElementById('nickname-counter');

// ランキング関連
const rankingDashboardBtn = document.getElementById('ranking-dashboard-btn');
const rankingModal = document.getElementById('ranking-modal');
const closeRankingBtn = document.getElementById('close-ranking-btn');
const rankingTableBody = document.getElementById('ranking-table-body');
const rankingUpdateTime = document.getElementById('ranking-update-time');
const rankingEmpty = document.getElementById('ranking-empty');
const rankingLoading = document.getElementById('ranking-loading');
const rankingError = document.getElementById('ranking-error');
const rankingErrorMessage = document.getElementById('ranking-error-message');
const rankingRetryBtn = document.getElementById('ranking-retry-btn');
const totalParticipantsElement = document.getElementById('total-participants');
const rankingBtn = document.getElementById('ranking-btn');

// ユーザー情報
let userInfo = {
    affiliation: '',
    nickname: ''
};

// ランキングシステム（Firestore連携）
class RankingSystem {
    constructor() {
        this.isLoading = false;
        this.lastError = null;
        this.collectionName = 'calculationGameRankings'; // 計算ゲーム専用コレクション
    }

    // Firestore直接操作でランキングデータを取得
    async getRankings() {
        this.isLoading = true;
        this.lastError = null;

        try {
            console.log('🔥 Firestore からランキングデータを取得中...');
            
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase が初期化されていません');
            }

            const { db, collection, getDocs, query, orderBy, limit } = window.firebase;
            
            const rankingsRef = collection(db, this.collectionName);
            const q = query(rankingsRef, orderBy('score', 'desc'), limit(20));
            const querySnapshot = await getDocs(q);
            
            const rankings = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                rankings.push({
                    id: doc.id,
                    score: data.score || 0,
                    problemsSolved: data.problemsSolved || 0,
                    accuracy: data.accuracy || 0,
                    nickname: data.nickname || '名無し',
                    affiliation: data.affiliation || '不明',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    sessionData: data.sessionData || {}
                });
            });

            console.log(`✅ ${rankings.length}件のランキングデータを取得`);

            localStorage.setItem('calculationGameRanking_backup', JSON.stringify(rankings));

            return {
                rankings: rankings,
                totalParticipants: rankings.length,
                count: rankings.length,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ ランキング取得エラー:', error);
            this.lastError = error.message;
            
            const backupData = localStorage.getItem('calculationGameRanking_backup');
            const backupArray = backupData ? JSON.parse(backupData) : [];
            
            return {
                rankings: backupArray,
                totalParticipants: backupArray.length,
                count: backupArray.length,
                lastUpdated: new Date().toISOString()
            };
        } finally {
            this.isLoading = false;
        }
    }

    // 新しいスコアをFirestoreに追加
    async addScore(score, problemsSolved, accuracy, nickname, affiliation, sessionData = {}) {
        this.isLoading = true;
        this.lastError = null;

        try {
            console.log('🔥 Firestore にスコアを送信中...');
            
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase が初期化されていません');
            }

            const { db, collection, addDoc } = window.firebase;
            
            const docRef = await addDoc(collection(db, this.collectionName), {
                score: parseInt(score),
                problemsSolved: parseInt(problemsSolved),
                accuracy: parseFloat(accuracy),
                nickname: nickname.trim(),
                affiliation: affiliation.trim(),
                timestamp: new Date(),
                sessionData: {
                    ...sessionData,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    level: selectedLevel,
                    gameVersion: 'Mt.MATH-calc-v1.0'
                }
            });

            console.log('✅ スコア送信完了, ID:', docRef.id);

            const latestData = await this.getRankings();
            const latestRankings = latestData.rankings || [];
            localStorage.setItem('calculationGameRanking_backup', JSON.stringify(latestRankings));

            return {
                success: true,
                id: docRef.id,
                message: 'スコアが正常に記録されました'
            };

        } catch (error) {
            console.error('❌ スコア送信エラー:', error);
            this.lastError = error.message;
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    clearError() {
        this.lastError = null;
    }

    getLoadingState() {
        return this.isLoading;
    }

    getLastError() {
        return this.lastError;
    }
}

const rankingSystem = new RankingSystem();

// 効果音関数
function playSound(frequency, duration, type = 'sine') {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        console.log('効果音の再生に失敗:', error);
    }
}

function playCorrectSound() {
    playSound(600, 0.1);
    setTimeout(() => playSound(800, 0.15), 100);
}

function playIncorrectSound() {
    playSound(200, 0.3, 'sawtooth');
}

function playTimeWarningSound() {
    playSound(400, 0.2, 'triangle');
}

// 紙吹雪エフェクト
function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#FF6B35', '#F7931E', '#FFD700', '#4CAF50', '#2196F3', '#9C27B0'];
    
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 3000);
}

// レベルごとのハイスコア管理
function getHighScoreForLevel(level) {
    const key = `calculationGameHighScore_${level}`;
    return parseInt(localStorage.getItem(key)) || 0;
}

function saveHighScoreForLevel(level, score) {
    const key = `calculationGameHighScore_${level}`;
    localStorage.setItem(key, score);
}

function updateHighScoreDisplay() {
    if (selectedLevel) {
        highScore = getHighScoreForLevel(selectedLevel);
        if (highScore > 0) {
            highScoreDisplay.textContent = `ハイスコア (${selectedLevel}): ${highScore}`;
        } else {
            highScoreDisplay.textContent = `ハイスコア (${selectedLevel}): --`;
        }
    }
}

// 文字数カウンター更新関数
function updateCharCounter(input, counter, maxLength) {
    const currentLength = input.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    
    counter.classList.remove('warning', 'danger');
    if (currentLength >= maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (currentLength >= maxLength * 0.7) {
        counter.classList.add('warning');
    }
}

// 問題生成関数
function generateProblem() {
    const config = LEVEL_CONFIG[selectedLevel];
    const operation = config.operations[Math.floor(Math.random() * config.operations.length)];
    
    let num1, num2, answer, problemText, hint;
    
    // 数値の範囲を取得
    const min = config.numberRange.min;
    const max = config.numberRange.max;
    
    switch (operation) {
        case '+':
            num1 = Math.floor(Math.random() * (max - min + 1)) + min;
            num2 = Math.floor(Math.random() * (max - min + 1)) + min;
            answer = num1 + num2;
            problemText = `${num1} + ${num2}`;
            hint = `足し算のコツ: 大きい数から小さい数を足すと計算しやすいです`;
            break;
            
        case '-':
            num1 = Math.floor(Math.random() * (max - min + 1)) + min;
            num2 = Math.floor(Math.random() * num1) + 1; // 負の数を避ける
            answer = num1 - num2;
            problemText = `${num1} - ${num2}`;
            hint = `引き算のコツ: ${num1} から ${num2} を引くには、${num1} - ${num2} = ${answer} です`;
            break;
            
        case '×':
            // 掛け算は少し小さめの数で
            const maxMul = selectedLevel === 'easy' ? 9 : selectedLevel === 'medium' ? 12 : 25;
            num1 = Math.floor(Math.random() * maxMul) + 1;
            num2 = Math.floor(Math.random() * maxMul) + 1;
            answer = num1 * num2;
            problemText = `${num1} × ${num2}`;
            hint = `九九を思い出してみましょう: ${num1} × ${num2} = ${answer}`;
            break;
            
        case '÷':
            // 割り算は整数で割り切れるように
            num2 = Math.floor(Math.random() * 12) + 2;
            answer = Math.floor(Math.random() * 20) + 1;
            num1 = num2 * answer;
            problemText = `${num1} ÷ ${num2}`;
            hint = `割り算のコツ: ${num1} ÷ ${num2} = ${answer} (${num2} × ${answer} = ${num1})`;
            break;
    }
    
    return {
        text: problemText,
        answer: answer,
        hint: hint,
        operation: operation
    };
}

// 新しい問題を表示
function showNewProblem() {
    currentProblem = generateProblem();
    correctAnswer = currentProblem.answer;
    hintUsed = false;
    
    // 問題表示のアニメーション
    problemDisplay.classList.add('changing');
    setTimeout(() => {
        problemDisplay.textContent = currentProblem.text;
        problemDisplay.classList.remove('changing');
    }, 150);
    
    // UI要素をリセット
    answerInput.value = '';
    answerInput.classList.remove('correct', 'incorrect');
    resultMessage.textContent = '';
    resultMessage.className = 'result-message';
    hintDisplay.classList.remove('show');
    hintBtn.disabled = false;
    
    // 入力フィールドにフォーカス
    setTimeout(() => {
        answerInput.focus();
    }, 200);
    
    questionsAnswered++;
    updateProgressDisplay();
}

// 進捗表示を更新
function updateProgressDisplay() {
    const progress = Math.min((questionsAnswered / 20) * 100, 100);
    progressBar.style.setProperty('--progress', `${progress}%`);
    progressText.textContent = `問題 ${questionsAnswered}`;
}

// タイマー機能
function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        // 残り時間警告
        if (timeLeft <= 10) {
            timerElement.parentElement.classList.add('time-warning');
            if (timeLeft <= 5) {
                playTimeWarningSound();
            }
        }
        
        if (timeLeft <= 0) {
            gameOver();
        }
    }, 1000);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// 答えをチェック
function checkAnswer() {
    if (!isGameActive || !currentProblem) return;
    
    const userAnswer = parseInt(answerInput.value);
    
    if (isNaN(userAnswer)) {
        answerInput.focus();
        return;
    }
    
    const correct = userAnswer === correctAnswer;
    
    // 振動フィードバック
    if ('vibrate' in navigator) {
        navigator.vibrate(correct ? 50 : [100, 50, 100]);
    }
    
    if (correct) {
        correctAnswers++;
        const baseScore = Math.round(10 * LEVEL_CONFIG[selectedLevel].scoreMultiplier);
        let earnedScore = baseScore;
        
        // ヒント使用時のペナルティ
        if (hintUsed) {
            earnedScore = Math.max(1, baseScore - LEVEL_CONFIG[selectedLevel].hintPenalty);
        }
        
        score += earnedScore;
        streak += 1;
        
        resultMessage.textContent = `正解！ +${earnedScore}点`;
        resultMessage.className = 'result-message correct';
        answerInput.classList.add('correct');
        
        playCorrectSound();
        
        // 連続正解ボーナス
        if (streak % 5 === 0) {
            const bonusScore = 50;
            score += bonusScore;
            resultMessage.textContent += ` 🎉 ${streak}問連続正解！ボーナス +${bonusScore}点！`;
            createConfetti();
            
            gameContainer.classList.add('streak-5');
            setTimeout(() => gameContainer.classList.remove('streak-5'), 3000);
        }
        
        // ハイスコア更新
        if (score > highScore) {
            highScore = score;
            saveHighScoreForLevel(selectedLevel, highScore);
            updateHighScoreDisplay();
        }
        
    } else {
        streak = 0;
        resultMessage.textContent = `不正解... 正解は ${correctAnswer} です`;
        resultMessage.className = 'result-message incorrect';
        answerInput.classList.add('incorrect');
        
        playIncorrectSound();
    }
    
    // スコア表示を更新
    scoreElement.textContent = score;
    streakElement.textContent = streak;
    
    // 少し待ってから次の問題へ
    setTimeout(() => {
        if (isGameActive) {
            showNewProblem();
        }
    }, 1500);
}

// ヒント表示
function showHint() {
    if (!currentProblem || hintUsed) return;
    
    hintDisplay.textContent = currentProblem.hint;
    hintDisplay.classList.add('show');
    hintBtn.disabled = true;
    hintUsed = true;
}

// ゲームオーバー処理
async function gameOver() {
    isGameActive = false;
    stopTimer();
    gameContent.classList.remove('active');
    gameOverScreen.style.display = 'block';
    
    const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
    
    finalScoreElement.textContent = score;
    finalProblemsElement.textContent = questionsAnswered;
    finalAccuracyElement.textContent = accuracy;
    
    // セッションデータを作成
    const gameEndTime = new Date();
    const gameDuration = gameStartTime ? (gameEndTime - gameStartTime) / 1000 : 0;
    const sessionData = {
        duration: gameDuration,
        questionsAnswered: questionsAnswered,
        correctAnswers: correctAnswers,
        accuracy: accuracy,
        level: selectedLevel,
        startTime: gameStartTime?.toISOString(),
        endTime: gameEndTime.toISOString()
    };
    
    // ゲームオーバーメッセージ
    if (score >= 300) {
        gameOverMessage.textContent = '素晴らしい！計算マスターですね！';
    } else if (score >= 150) {
        gameOverMessage.textContent = 'よく頑張りました！もっと高得点を目指しましょう！';
    } else {
        gameOverMessage.textContent = '練習あるのみ！次はもっと高得点を狙いましょう！';
    }
    
    // 上級レベルでスコアが記録できる場合、ランキングに追加
    if (selectedLevel === 'hard' && userInfo.nickname && userInfo.affiliation && score > 0) {
        try {
            gameOverMessage.textContent += ' スコアを記録中...';
            
            await rankingSystem.addScore(score, questionsAnswered, accuracy, userInfo.nickname, userInfo.affiliation, sessionData);
            
            gameOverMessage.textContent = gameOverMessage.textContent.replace(' スコアを記録中...', ' ランキングに記録されました！🎉');
            
        } catch (error) {
            console.error('スコア送信エラー:', error);
            gameOverMessage.textContent = gameOverMessage.textContent.replace(' スコアを記録中...', ' ⚠️ スコアの記録に失敗しました');
        }
    }
    
    playSound(200, 0.5, 'sawtooth');
}

// ゲーム開始
function startGame() {
    // 上級レベルの場合、ユーザー情報をバリデーション
    if (selectedLevel === 'hard') {
        const affiliation = userAffiliationInput.value.trim();
        const nickname = userNicknameInput.value.trim();
        
        if (!affiliation || !nickname) {
            alert('ランキングに参加するには、所属とニックネームの入力が必要です。');
            return;
        }
        
        userInfo.affiliation = affiliation;
        userInfo.nickname = nickname;
    }
    
    // ゲーム設定
    const config = LEVEL_CONFIG[selectedLevel];
    gameTime = config.time;
    timeLeft = gameTime;
    
    // ゲーム状態初期化
    isGameActive = true;
    score = 0;
    streak = 0;
    questionsAnswered = 0;
    correctAnswers = 0;
    gameStartTime = new Date();
    
    // UI更新
    scoreElement.textContent = score;
    streakElement.textContent = streak;
    timerElement.textContent = timeLeft;
    timerElement.parentElement.classList.remove('time-warning');
    
    // 画面切り替え
    startBtn.style.display = 'none';
    backToLevelBtn.style.display = 'none';
    levelSelection.style.display = 'none';
    userInfoForm.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContent.classList.add('active');
    
    updateHighScoreDisplay();
    updateProgressDisplay();
    showNewProblem();
    startTimer();
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ランキング表示関連
async function showRankingDashboard() {
    rankingModal.style.display = 'block';
    await updateRankingDisplay();
}

function closeRankingDashboard() {
    rankingModal.style.display = 'none';
}

function resetRankingDisplayState() {
    rankingLoading.style.display = 'none';
    rankingError.style.display = 'none';
    rankingTableBody.style.display = 'none';
    rankingEmpty.style.display = 'none';
}

async function updateRankingDisplay() {
    resetRankingDisplayState();
    rankingLoading.style.display = 'block';
    
    try {
        const data = await rankingSystem.getRankings();
        const rankings = data.rankings || [];
        const totalParticipants = data.totalParticipants || 0;
        
        rankingLoading.style.display = 'none';
        
        if (rankings.length === 0) {
            rankingEmpty.style.display = 'block';
            rankingUpdateTime.textContent = '--';
            totalParticipantsElement.textContent = totalParticipants || '--';
            return;
        }

        rankingTableBody.style.display = 'table-row-group';
        rankingTableBody.innerHTML = '';
        
        rankings.forEach((entry, index) => {
            const row = document.createElement('tr');
            if (index < 3) {
                row.classList.add(`rank-${index + 1}`);
            }
            
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            const date = new Date(entry.timestamp);
            const timeString = date.toLocaleString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            row.innerHTML = `
                <td>${medal} ${rank}</td>
                <td class="score-cell">${entry.score}</td>
                <td class="problems-cell">${entry.problemsSolved}</td>
                <td class="accuracy-cell">${entry.accuracy}%</td>
                <td class="nickname-cell">${escapeHtml(entry.nickname)}</td>
                <td class="affiliation-cell">${escapeHtml(entry.affiliation)}</td>
                <td class="time-cell">${timeString}</td>
            `;
            
            rankingTableBody.appendChild(row);
        });
        
        const now = new Date();
        rankingUpdateTime.textContent = now.toLocaleString('ja-JP');
        totalParticipantsElement.textContent = totalParticipants;
        
    } catch (error) {
        rankingLoading.style.display = 'none';
        rankingError.style.display = 'block';
        rankingErrorMessage.textContent = error.message || 'ランキングの読み込みに失敗しました';
        console.error('ランキング表示エラー:', error);
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // レベル選択
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedLevel = button.dataset.level;
            levelSelection.style.display = 'none';
            
            if (selectedLevel === 'hard') {
                userInfoForm.style.display = 'block';
                startBtn.textContent = '上級でスタート！';
            } else {
                userInfoForm.style.display = 'none';
                startBtn.textContent = `${button.querySelector('.level-name').textContent}でスタート！`;
            }
            
            startBtn.style.display = 'block';
            backToLevelBtn.style.display = 'block';
        });
    });

    // ゲーム制御
    startBtn.addEventListener('click', startGame);
    
    restartBtn.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        levelSelection.style.display = 'block';
        userInfoForm.style.display = 'none';
        startBtn.style.display = 'none';
        backToLevelBtn.style.display = 'none';
        selectedLevel = null;
        
        userInfo.affiliation = '';
        userInfo.nickname = '';
        userAffiliationInput.value = '';
        userNicknameInput.value = '';
        
        affiliationCounter.textContent = '0/10';
        nicknameCounter.textContent = '0/10';
        affiliationCounter.classList.remove('warning', 'danger');
        nicknameCounter.classList.remove('warning', 'danger');
    });

    backToLevelBtn.addEventListener('click', () => {
        levelSelection.style.display = 'block';
        startBtn.style.display = 'none';
        backToLevelBtn.style.display = 'none';
        userInfoForm.style.display = 'none';
        selectedLevel = null;
        
        userInfo.affiliation = '';
        userInfo.nickname = '';
        userAffiliationInput.value = '';
        userNicknameInput.value = '';
        
        affiliationCounter.textContent = '0/10';
        nicknameCounter.textContent = '0/10';
        affiliationCounter.classList.remove('warning', 'danger');
        nicknameCounter.classList.remove('warning', 'danger');
    });

    // 回答関連
    submitBtn.addEventListener('click', checkAnswer);
    hintBtn.addEventListener('click', showHint);
    
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });

    // ランキング関連
    rankingDashboardBtn.addEventListener('click', showRankingDashboard);
    if (rankingBtn) {
        rankingBtn.addEventListener('click', showRankingDashboard);
    }
    closeRankingBtn.addEventListener('click', closeRankingDashboard);

    rankingModal.addEventListener('click', (e) => {
        if (e.target === rankingModal) {
            closeRankingDashboard();
        }
    });

    rankingRetryBtn.addEventListener('click', async () => {
        await updateRankingDisplay();
    });

    // 文字数カウンター
    userAffiliationInput.addEventListener('input', () => {
        updateCharCounter(userAffiliationInput, affiliationCounter, 10);
    });

    userNicknameInput.addEventListener('input', () => {
        updateCharCounter(userNicknameInput, nicknameCounter, 10);
    });

    console.log('🧮 計算チャレンジゲーム初期化完了');
});