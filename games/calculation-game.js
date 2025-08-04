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
let gameTimer = null;
let questionsAnswered = 0;
let correctAnswers = 0;
let highScore = 0;
let gameStartTime = null;
// ヒント機能は削除済み

// 難易度設定
const LEVEL_CONFIG = {
    easy: {
        time: 90,
        numberRange: { min: 1, max: 9 },
        operations: ['+', '-', '×'],
        scoreMultiplier: 1
    },
    medium: {
        time: 75,
        numberRange: { min: 10, max: 99 },
        operations: ['+', '-', '×', '÷'],
        scoreMultiplier: 1.5
    },
    hard: {
        time: 60,
        numberRange: { min: 10, max: 999 },
        operations: ['+', '-', '×', '÷'],
        scoreMultiplier: 2
    }
};

// DOM要素の取得（DOMContentLoaded内で実行）
let scoreElement, streakElement, timerElement, problemDisplay, answerInput, submitBtn, resultMessage;
let startBtn, gameContent, levelSelection, levelButtons, gameContainer, gameInfo, highScoreDisplay;
let progressBar, progressText, gameOverScreen, finalScoreElement, finalProblemsElement, finalAccuracyElement, gameOverMessage, restartBtn;
let userInfoForm, userAffiliationInput, userNicknameInput, backToLevelBtn, affiliationCounter, nicknameCounter;
let rankingDashboardBtn, rankingModal, closeRankingBtn, rankingTableBody, rankingUpdateTime, rankingEmpty, rankingLoading;
let rankingError, rankingErrorMessage, rankingRetryBtn, totalParticipantsElement, rankingBtn;

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

            const { db } = window.firebase;
            
            // v8形式でクエリを実行
            const querySnapshot = await db.collection(this.collectionName)
                .orderBy('score', 'desc')
                .limit(20)
                .get();
            
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

            const { db } = window.firebase;
            
            // v8形式でドキュメントを追加
            const docRef = await db.collection(this.collectionName).add({
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
    
    let num1, num2, answer, problemText;
    
    // 数値の範囲を取得
    const min = config.numberRange.min;
    const max = config.numberRange.max;
    
    switch (operation) {
        case '+':
            num1 = Math.floor(Math.random() * (max - min + 1)) + min;
            num2 = Math.floor(Math.random() * (max - min + 1)) + min;
            answer = num1 + num2;
            problemText = `${num1} + ${num2}`;
            break;
            
        case '-':
            num1 = Math.floor(Math.random() * (max - min + 1)) + min;
            num2 = Math.floor(Math.random() * num1) + 1; // 負の数を避ける
            answer = num1 - num2;
            problemText = `${num1} - ${num2}`;
            break;
            
        case '×':
            // 掛け算は少し小さめの数で
            const maxMul = selectedLevel === 'easy' ? 9 : selectedLevel === 'medium' ? 12 : 25;
            num1 = Math.floor(Math.random() * maxMul) + 1;
            num2 = Math.floor(Math.random() * maxMul) + 1;
            answer = num1 * num2;
            problemText = `${num1} × ${num2}`;
            break;
            
        case '÷':
            // 割り算は整数で割り切れるように
            num2 = Math.floor(Math.random() * 12) + 2;
            answer = Math.floor(Math.random() * 20) + 1;
            num1 = num2 * answer;
            problemText = `${num1} ÷ ${num2}`;
            break;
    }
    
    return {
        text: problemText,
        answer: answer,
        operation: operation
    };
}

// 新しい問題を表示
function showNewProblem() {
    currentProblem = generateProblem();
    correctAnswer = currentProblem.answer;
    
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
    gameTimer = setInterval(() => {
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
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
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

// ヒント機能は削除済み

// ゲームオーバー処理
async function gameOver() {
    isGameActive = false;
    stopTimer();
    gameContent.classList.remove('active');
    gameContent.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    
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
    gameContent.style.display = 'block';
    gameContent.classList.add('active');
    
    // ゲーム情報を表示
    if (gameInfo) {
        gameInfo.style.display = 'block';
    }
    
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
    console.log('🏆 ランキングダッシュボードを表示中...');
    try {
        rankingModal.style.display = 'block';
        await updateRankingDisplay();
        console.log('✅ ランキングダッシュボード表示完了');
    } catch (error) {
        console.error('❌ ランキングダッシュボード表示エラー:', error);
        alert('ランキングの表示に失敗しました: ' + error.message);
    }
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
    console.log('🧮 計算チャレンジゲーム: DOMContentLoaded開始！');
    
    // DOM要素の取得
    scoreElement = document.getElementById('score');
    streakElement = document.getElementById('streak');
    timerElement = document.getElementById('timer');
    problemDisplay = document.getElementById('problem-display');
    answerInput = document.getElementById('answer-input');
    submitBtn = document.getElementById('submit-btn');
    resultMessage = document.getElementById('result-message');
    startBtn = document.getElementById('start-btn');
    gameContent = document.querySelector('.game-content');
    levelSelection = document.getElementById('level-selection');
    levelButtons = document.querySelectorAll('.level-btn');
    gameContainer = document.getElementById('calculation-game');
    gameInfo = document.querySelector('.game-info');
    highScoreDisplay = document.getElementById('high-score-display');
    progressBar = document.getElementById('progress-bar');
    progressText = document.getElementById('progress-text');
    gameOverScreen = document.getElementById('game-over');
    finalScoreElement = document.getElementById('final-score');
    finalProblemsElement = document.getElementById('final-problems');
    finalAccuracyElement = document.getElementById('final-accuracy');
    gameOverMessage = document.getElementById('game-over-message');
    restartBtn = document.getElementById('restart-btn');
    
    // ユーザー情報関連
    userInfoForm = document.getElementById('user-info-form');
    userAffiliationInput = document.getElementById('user-affiliation');
    userNicknameInput = document.getElementById('user-nickname');
    backToLevelBtn = document.getElementById('back-to-level-btn');
    affiliationCounter = document.getElementById('affiliation-counter');
    nicknameCounter = document.getElementById('nickname-counter');
    
    // ランキング関連
    rankingDashboardBtn = document.getElementById('ranking-dashboard-btn');
    rankingModal = document.getElementById('ranking-modal');
    closeRankingBtn = document.getElementById('close-ranking-btn');
    rankingTableBody = document.getElementById('ranking-table-body');
    rankingUpdateTime = document.getElementById('ranking-update-time');
    rankingEmpty = document.getElementById('ranking-empty');
    rankingLoading = document.getElementById('ranking-loading');
    rankingError = document.getElementById('ranking-error');
    rankingErrorMessage = document.getElementById('ranking-error-message');
    rankingRetryBtn = document.getElementById('ranking-retry-btn');
    totalParticipantsElement = document.getElementById('total-participants');
    rankingBtn = document.getElementById('ranking-btn');
    
    console.log('🔍 DOM要素取得完了:', {
        scoreElement: !!scoreElement,
        rankingDashboardBtn: !!rankingDashboardBtn,
        gameInfo: !!gameInfo
    });
    
    // 初期状態：ゲーム情報を非表示
    if (gameInfo) {
        gameInfo.style.display = 'none';
        console.log('✅ 初期状態：ゲーム情報を非表示に設定');
    }
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
        gameContent.style.display = 'none';
        levelSelection.style.display = 'block';
        userInfoForm.style.display = 'none';
        startBtn.style.display = 'none';
        backToLevelBtn.style.display = 'none';
        selectedLevel = null;
        
        // ゲーム情報を非表示
        if (gameInfo) {
            gameInfo.style.display = 'none';
        }
        
        // ゲーム状態をリセット
        score = 0;
        streak = 0;
        questionsAnswered = 0;
        correctAnswers = 0;
        timeLeft = 60;
        isGameActive = false;
        
        // UI表示をリセット
        scoreElement.textContent = '0';
        streakElement.textContent = '0';
        timerElement.textContent = '60';
        
        // タイマーを停止
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
        
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
        gameContent.style.display = 'none';
        gameOverScreen.style.display = 'none';
        levelSelection.style.display = 'block';
        startBtn.style.display = 'none';
        backToLevelBtn.style.display = 'none';
        userInfoForm.style.display = 'none';
        selectedLevel = null;
        
        // ゲーム情報を非表示
        if (gameInfo) {
            gameInfo.style.display = 'none';
        }
        
        // ゲーム状態をリセット
        score = 0;
        streak = 0;
        questionsAnswered = 0;
        correctAnswers = 0;
        timeLeft = 60;
        isGameActive = false;
        
        // UI表示をリセット
        scoreElement.textContent = '0';
        streakElement.textContent = '0';
        timerElement.textContent = '60';
        
        // タイマーを停止
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
        
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
    
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });

    // ランキング関連
    console.log('🔍 ランキングボタンの設定:', {
        rankingDashboardBtn: !!rankingDashboardBtn,
        rankingBtn: !!rankingBtn,
        closeRankingBtn: !!closeRankingBtn
    });
    
    console.log('🔍 要素詳細情報:', {
        rankingDashboardBtn_element: rankingDashboardBtn,
        rankingDashboardBtn_id: rankingDashboardBtn?.id,
        rankingDashboardBtn_className: rankingDashboardBtn?.className,
        rankingDashboardBtn_style_display: rankingDashboardBtn?.style.display,
        rankingDashboardBtn_disabled: rankingDashboardBtn?.disabled,
        rankingDashboardBtn_style_pointerEvents: rankingDashboardBtn?.style.pointerEvents,
        rankingDashboardBtn_style_position: rankingDashboardBtn?.style.position,
        rankingDashboardBtn_style_zIndex: rankingDashboardBtn?.style.zIndex,
        rankingDashboardBtn_offsetParent: rankingDashboardBtn?.offsetParent,
        rankingDashboardBtn_getBoundingClientRect: rankingDashboardBtn?.getBoundingClientRect()
    });
    
    if (rankingDashboardBtn) {
        // 複数のイベントリスナーを追加してテスト
        rankingDashboardBtn.addEventListener('click', function(event) {
            console.log('🎯 ランキングダッシュボードボタンがクリックされました！', event);
            showRankingDashboard();
        });
        
        rankingDashboardBtn.addEventListener('mousedown', function(event) {
            console.log('🖱️ ランキングボタンがマウスダウンされました！', event);
        });
        
        rankingDashboardBtn.addEventListener('mouseup', function(event) {
            console.log('🖱️ ランキングボタンがマウスアップされました！', event);
        });
        
        // 直接onclickも設定
        rankingDashboardBtn.onclick = function(event) {
            console.log('🎯 ランキングボタンonclick発火！', event);
            showRankingDashboard();
        };
        
        console.log('✅ ランキングダッシュボードボタンのイベントリスナー設定完了');
    } else {
        console.error('❌ ランキングダッシュボードボタンが見つかりません');
    }
    
    if (rankingBtn) {
        rankingBtn.addEventListener('click', showRankingDashboard);
        console.log('✅ ランキングボタンのイベントリスナー設定完了');
    }
    
    if (closeRankingBtn) {
        closeRankingBtn.addEventListener('click', closeRankingDashboard);
        console.log('✅ ランキング閉じるボタンのイベントリスナー設定完了');
    }

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
    
    // Firebase初期化状況をチェック
    setTimeout(() => {
        console.log('🔥 Firebase状況:', {
            windowFirebase: !!window.firebase,
            db: !!(window.firebase && window.firebase.db),
            addDoc: !!(window.firebase && window.firebase.addDoc),
            collection: !!(window.firebase && window.firebase.collection)
        });
    }, 1000);
});