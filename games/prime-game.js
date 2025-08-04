// 素数判定ゲーム - Mt.MATH版
// Based on Yusei Fujii's Prime Game

// ゲーム状態管理
let score = 0;
let streak = 0;
let currentNumber = 0;
let isGameActive = false;
let selectedLevel = null;
let maxNumber = 299; // デフォルトは中級
let questionsAnswered = 0;
let highScore = 0;
let lives = 3;
const MAX_LIVES = 3;
let gameStartTime = null;

// DOM要素の取得
const scoreElement = document.getElementById('score');
const streakElement = document.getElementById('streak');
const numberDisplay = document.getElementById('number-display');
const resultMessage = document.getElementById('result-message');
const startBtn = document.getElementById('start-btn');
const primeBtn = document.getElementById('prime-btn');
const notPrimeBtn = document.getElementById('not-prime-btn');
const gameContent = document.querySelector('.game-content');
const levelSelection = document.getElementById('level-selection');
const levelButtons = document.querySelectorAll('.level-btn');
const gameContainer = document.getElementById('prime-game');
const highScoreDisplay = document.getElementById('high-score-display');
const livesDisplay = document.getElementById('lives-display');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
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

// API設定
const API_CONFIG = {
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : '', // Vercelでは相対パスを使用
    timeout: 10000 // 10秒タイムアウト
};

// ランキングシステム（Firestore連携）
class RankingSystem {
    constructor() {
        this.isLoading = false;
        this.lastError = null;
    }

    // Firestore直接操作でランキングデータを取得
    async getRankings() {
        this.isLoading = true;
        this.lastError = null;

        try {
            console.log('🔥 Firestore からランキングデータを取得中...');
            
            // Firebase設定の確認
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase が初期化されていません');
            }

            const { db } = window.firebase;
            
            // v8形式でクエリを実行
            const querySnapshot = await db.collection('primeGameRankings')
                .orderBy('score', 'desc')
                .limit(20)
                .get();
            
            const rankings = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                rankings.push({
                    id: doc.id,
                    score: data.score || 0,
                    nickname: data.nickname || '名無し',
                    affiliation: data.affiliation || '不明',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    sessionData: data.sessionData || {}
                });
            });

            console.log(`✅ ${rankings.length}件のランキングデータを取得`);

            // バックアップとして localStorage に保存
            localStorage.setItem('primeGameRanking_backup', JSON.stringify(rankings));

            return {
                rankings: rankings,
                totalParticipants: rankings.length,
                count: rankings.length,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ ランキング取得エラー:', error);
            this.lastError = error.message;
            
            // エラー時はLocalStorageのバックアップデータを返す
            const backupData = localStorage.getItem('primeGameRanking_backup');
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
    async addScore(score, nickname, affiliation, sessionData = {}) {
        this.isLoading = true;
        this.lastError = null;

        try {
            console.log('🔥 Firestore にスコアを送信中...');
            
            // Firebase設定の確認
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase が初期化されていません');
            }

            const { db } = window.firebase;
            
            // v8形式でドキュメントを追加
            const docRef = await db.collection('primeGameRankings').add({
                score: parseInt(score),
                nickname: nickname.trim(),
                affiliation: affiliation.trim(),
                timestamp: new Date(),
                sessionData: {
                    ...sessionData,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    level: selectedLevel,
                    gameVersion: 'Mt.MATH-v1.0'
                }
            });

            console.log('✅ スコア送信完了, ID:', docRef.id);

            // 成功時は最新ランキングを取得してバックアップとして保存
            const latestData = await this.getRankings();
            const latestRankings = latestData.rankings || [];
            localStorage.setItem('primeGameRanking_backup', JSON.stringify(latestRankings));

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

    // エラー状態をクリア
    clearError() {
        this.lastError = null;
    }

    // ローディング状態を取得
    getLoadingState() {
        return this.isLoading;
    }

    // 最後のエラーを取得
    getLastError() {
        return this.lastError;
    }
}

const rankingSystem = new RankingSystem();

// 効果音を作成する関数
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

// 各種効果音
function playCorrectSound() {
    playSound(523, 0.1); // C5
    setTimeout(() => playSound(659, 0.1), 100); // E5
    setTimeout(() => playSound(784, 0.2), 200); // G5
}

function playIncorrectSound() {
    playSound(300, 0.3, 'sawtooth');
}

function playLevelUpSound() {
    playSound(440, 0.1); // A4
    setTimeout(() => playSound(554, 0.1), 100); // C#5
    setTimeout(() => playSound(659, 0.1), 200); // E5
    setTimeout(() => playSound(880, 0.3), 300); // A5
}

// 紙吹雪エフェクト
function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 50; i++) {
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
    const key = `primeGameHighScore_${level}`;
    return parseInt(localStorage.getItem(key)) || 0;
}

function saveHighScoreForLevel(level, score) {
    const key = `primeGameHighScore_${level}`;
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

// ライフ表示を更新
function updateLivesDisplay() {
    const lifeIcons = livesDisplay.querySelectorAll('.life-icon');
    lifeIcons.forEach((icon, index) => {
        if (index >= lives) {
            icon.classList.add('lost');
        } else {
            icon.classList.remove('lost');
        }
    });
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

// 素数判定関数
function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) {
            return false;
        }
    }
    return true;
}

// 素因数分解関数
function primeFactorization(n) {
    const factors = [];
    let num = n;
    
    // 2で割れるだけ割る
    while (num % 2 === 0) {
        factors.push(2);
        num = num / 2;
    }
    
    // 3以上の奇数で割る
    for (let i = 3; i * i <= num; i += 2) {
        while (num % i === 0) {
            factors.push(i);
            num = num / i;
        }
    }
    
    // 残った数が1より大きければそれも素因数
    if (num > 1) {
        factors.push(num);
    }
    
    return factors;
}

// ランダムな奇数を生成
function generateRandomNumber() {
    // maxNumberに基づいて奇数を生成
    const maxOddIndex = Math.floor((maxNumber - 1) / 2);
    const oddIndex = Math.floor(Math.random() * maxOddIndex) + 1;
    return oddIndex * 2 + 1;
}

// 新しい問題を表示
function showNewNumber() {
    currentNumber = generateRandomNumber();
    
    // フェードアニメーション
    numberDisplay.classList.add('changing');
    setTimeout(() => {
        numberDisplay.textContent = currentNumber;
        numberDisplay.classList.remove('changing');
    }, 100);
    
    resultMessage.textContent = '';
    resultMessage.className = 'result-message';
    
    questionsAnswered++;
}

// 答えをチェック
function checkAnswer(userSaysPrime) {
    const actuallyPrime = isPrime(currentNumber);
    const correct = userSaysPrime === actuallyPrime;
    
    // 振動フィードバック（対応デバイスのみ）
    if ('vibrate' in navigator) {
        navigator.vibrate(correct ? 50 : [100, 50, 100]);
    }
    
    if (correct) {
        score += 10;
        streak += 1;
        resultMessage.textContent = '正解！ 🎉';
        resultMessage.className = 'result-message correct';
        
        // 効果音
        playCorrectSound();
        
        // スコア更新アニメーション
        scoreElement.parentElement.classList.add('updating');
        setTimeout(() => scoreElement.parentElement.classList.remove('updating'), 300);
        
        // 連続正解ボーナス
        if (streak % 5 === 0) {
            score += 20;
            resultMessage.textContent += ` ${streak}問連続正解！ボーナス +20点！`;
            playLevelUpSound();
            createConfetti();
            
            // 虹色の枠線
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
        lives--;
        
        // ライフアイコンにアニメーション
        const lifeIcons = livesDisplay.querySelectorAll('.life-icon');
        if (lives >= 0 && lives < MAX_LIVES) {
            lifeIcons[lives].classList.add('losing');
            setTimeout(() => {
                lifeIcons[lives].classList.remove('losing');
                updateLivesDisplay();
            }, 500);
        }
        
        if (actuallyPrime) {
            resultMessage.textContent = `残念... ${currentNumber}は素数です`;
        } else {
            // 素因数分解を表示
            const factors = primeFactorization(currentNumber);
            const factorString = factors.join(' × ');
            resultMessage.textContent = `残念... ${currentNumber} = ${factorString}`;
        }
        
        // 残りライフを表示
        if (lives > 0) {
            resultMessage.textContent += ` (残りライフ: ${lives})`;
        }
        
        resultMessage.className = 'result-message incorrect';
        
        // 効果音
        playIncorrectSound();
        
        // ゲームオーバーチェック
        if (lives <= 0) {
            setTimeout(async () => {
                await gameOver();
            }, 1500);
            return;
        }
    }
    
    scoreElement.textContent = score;
    streakElement.textContent = streak;
    
    // 3秒後に次の問題へ（素因数分解を見る時間を確保）
    setTimeout(() => {
        if (isGameActive) {
            showNewNumber();
        }
    }, 3000);
}

// ゲームオーバー処理
async function gameOver() {
    isGameActive = false;
    gameContent.classList.remove('active');
    gameContent.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    finalScoreElement.textContent = score;
    
    // セッションデータを作成
    const gameEndTime = new Date();
    const gameDuration = gameStartTime ? (gameEndTime - gameStartTime) / 1000 : 0;
    const sessionData = {
        duration: gameDuration,
        questionsAnswered: questionsAnswered,
        level: selectedLevel,
        startTime: gameStartTime?.toISOString(),
        endTime: gameEndTime.toISOString()
    };
    
    // 基本のゲームオーバーメッセージ
    if (score >= 100) {
        gameOverMessage.textContent = 'すばらしい成績です！素数マスターですね！';
    } else if (score >= 50) {
        gameOverMessage.textContent = 'よく頑張りました！もう一度挑戦してみましょう！';
    } else {
        gameOverMessage.textContent = '練習あるのみ！次はもっと高得点を目指しましょう！';
    }
    
    // 上級レベルでスコアが記録できる場合、ランキングに追加
    if (selectedLevel === 'hard' && userInfo.nickname && userInfo.affiliation && score > 0) {
        try {
            // スコア送信中のメッセージ
            gameOverMessage.textContent += ' スコアを記録中...';
            
            await rankingSystem.addScore(score, userInfo.nickname, userInfo.affiliation, sessionData);
            
            // 成功メッセージ
            gameOverMessage.textContent = gameOverMessage.textContent.replace(' スコアを記録中...', ' ランキングに記録されました！🎉');
            
        } catch (error) {
            console.error('スコア送信エラー:', error);
            
            // エラーメッセージ
            gameOverMessage.textContent = gameOverMessage.textContent.replace(' スコアを記録中...', ' ⚠️ スコアの記録に失敗しました');
        }
    }
    
    // ゲームオーバー音
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
    
    isGameActive = true;
    score = 0;
    streak = 0;
    questionsAnswered = 0;
    lives = MAX_LIVES;
    gameStartTime = new Date();
    scoreElement.textContent = score;
    streakElement.textContent = streak;
    
    startBtn.style.display = 'none';
    backToLevelBtn.style.display = 'none';
    levelSelection.style.display = 'none';
    userInfoForm.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContent.style.display = 'block';
    gameContent.classList.add('active');
    
    updateHighScoreDisplay();
    updateLivesDisplay();
    showNewNumber();
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
    // レベル選択の処理
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedLevel = button.dataset.level;
            
            // レベルに応じて最大数を設定
            switch(selectedLevel) {
                case 'easy':
                    maxNumber = 99;
                    break;
                case 'medium':
                    maxNumber = 299;
                    break;
                case 'hard':
                    maxNumber = 999;
                    break;
            }
            
            levelSelection.style.display = 'none';
            
            // 上級レベルの場合、ユーザー情報入力フォームを表示
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

    // ゲーム制御ボタン
    startBtn.addEventListener('click', startGame);
    
    restartBtn.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        gameContent.style.display = 'none';
        levelSelection.style.display = 'block';
        userInfoForm.style.display = 'none';
        startBtn.style.display = 'none';
        backToLevelBtn.style.display = 'none';
        selectedLevel = null;
        
        // ユーザー情報をリセット
        userInfo.affiliation = '';
        userInfo.nickname = '';
        userAffiliationInput.value = '';
        userNicknameInput.value = '';
        
        // 文字数カウンターをリセット
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
        
        // ユーザー情報をリセット
        userInfo.affiliation = '';
        userInfo.nickname = '';
        userAffiliationInput.value = '';
        userNicknameInput.value = '';
        
        // 文字数カウンターをリセット
        affiliationCounter.textContent = '0/10';
        nicknameCounter.textContent = '0/10';
        affiliationCounter.classList.remove('warning', 'danger');
        nicknameCounter.classList.remove('warning', 'danger');
    });

    // ゲームボタン
    primeBtn.addEventListener('click', () => {
        if (isGameActive && numberDisplay.textContent) {
            checkAnswer(true);
        }
    });

    notPrimeBtn.addEventListener('click', () => {
        if (isGameActive && numberDisplay.textContent) {
            checkAnswer(false);
        }
    });

    // ランキング関連
    console.log('🔍 ランキングボタンの設定:', {
        rankingDashboardBtn: !!rankingDashboardBtn,
        rankingBtn: !!rankingBtn,
        closeRankingBtn: !!closeRankingBtn
    });
    
    if (rankingDashboardBtn) {
        rankingDashboardBtn.addEventListener('click', showRankingDashboard);
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

    // モーダルの外側をクリックしたときに閉じる
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

    // タッチデバイス用の処理
    if ('ontouchstart' in window) {
        primeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameActive && numberDisplay.textContent) {
                checkAnswer(true);
            }
        });
        
        notPrimeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameActive && numberDisplay.textContent) {
                checkAnswer(false);
            }
        });
    }

    console.log('🎮 素数判定ゲーム初期化完了');
    
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