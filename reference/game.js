// 素数判定ゲームのJavaScript

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
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.querySelector('.progress-container');
const livesDisplay = document.getElementById('lives-display');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const gameOverMessage = document.getElementById('game-over-message');
const restartBtn = document.getElementById('restart-btn');

// 新しく追加するDOM要素
const userInfoForm = document.getElementById('user-info-form');
const userAffiliationInput = document.getElementById('user-affiliation');
const userNicknameInput = document.getElementById('user-nickname');
const backToLevelBtn = document.getElementById('back-to-level-btn');
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

// 文字数カウンター
const affiliationCounter = document.getElementById('affiliation-counter');
const nicknameCounter = document.getElementById('nickname-counter');

// 掲示板関連の要素
const postNicknameInput = document.getElementById('post-nickname');
const postContentInput = document.getElementById('post-content');
const submitPostBtn = document.getElementById('submit-post-btn');
const postsLoading = document.getElementById('posts-loading');
const postsError = document.getElementById('posts-error');
const postsErrorMessage = document.getElementById('posts-error-message');
const postsRetryBtn = document.getElementById('posts-retry-btn');
const postsEmpty = document.getElementById('posts-empty');
const postsList = document.getElementById('posts-list');
const totalPostsElement = document.getElementById('total-posts');
const postNicknameCounter = document.getElementById('post-nickname-counter');
const postContentCounter = document.getElementById('post-content-counter');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreCount = document.getElementById('load-more-count');

// ユーザー情報
let userInfo = {
    affiliation: '',
    nickname: ''
};

// 投稿表示管理
let allPosts = []; // 全ての投稿データ
let displayedPostsCount = 0; // 現在表示されている投稿数
const POSTS_PER_PAGE = 10; // 1回に表示する投稿数

// API設定
const API_CONFIG = {
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : '', // Vercelでは相対パスを使用
    timeout: 10000 // 10秒タイムアウト
};

// ランキングシステム（API実装）
class RankingSystem {
    constructor() {
        this.isLoading = false;
        this.lastError = null;
    }

    // API呼び出し共通メソッド
    async apiCall(endpoint, options = {}) {
        const url = `${API_CONFIG.baseURL}/api${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: API_CONFIG.timeout,
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTPエラー:', response.status, errorText);
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'APIエラーが発生しました');
            }

            return data;
        } catch (error) {
            console.error('💥 API呼び出しエラー:', error);
            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            }
            throw error;
        }
    }

    // ランキングデータを取得
    async getRankings() {
        this.isLoading = true;
        this.lastError = null;

        try {
            console.log('🌐 API呼び出し開始: /rankings/get');
            const data = await this.apiCall('/rankings/get', {
                method: 'GET'
            });

            // API全体のレスポンスを返す（rankings配列 + totalParticipants）
            return data;
        } catch (error) {
            console.error('❌ ランキング取得エラー:', error);
            this.lastError = error.message;
            
            // エラー時はLocalStorageのバックアップデータを返す
            const backupData = localStorage.getItem('primeGameRanking_backup');
            const backupArray = backupData ? JSON.parse(backupData) : [];
            
            // バックアップデータをAPIレスポンス形式で返す
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

    // 新しいスコアを追加
    async addScore(score, nickname, affiliation, sessionData = {}) {
        this.isLoading = true;
        this.lastError = null;

        try {
            const data = await this.apiCall('/rankings/submit', {
                method: 'POST',
                body: JSON.stringify({
                    score,
                    nickname,
                    affiliation,
                    sessionData: {
                        ...sessionData,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                    }
                })
            });

            // 成功時は最新ランキングを取得してバックアップとして保存
            const latestData = await this.getRankings();
            const latestRankings = latestData.rankings || [];
            localStorage.setItem('primeGameRanking_backup', JSON.stringify(latestRankings));

            return data;
        } catch (error) {
            console.error('スコア送信エラー:', error);
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

// 掲示板システム（API実装）
class BoardSystem {
    constructor() {
        this.isLoading = false;
        this.lastError = null;
    }

    // API呼び出し共通メソッド（RankingSystemと同じ構造）
    async apiCall(endpoint, options = {}) {
        const url = `${API_CONFIG.baseURL}/api${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: API_CONFIG.timeout,
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTPエラー:', response.status, errorText);
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'APIエラーが発生しました');
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            }
            throw error;
        }
    }

    // 投稿を送信
    async submitPost(nickname, content) {
        if (this.isLoading) {
            throw new Error('現在処理中です。しばらくお待ちください。');
        }

        this.isLoading = true;

        try {
            const data = await this.apiCall('/board/submit', {
                method: 'POST',
                body: JSON.stringify({
                    nickname: nickname,
                    content: content
                })
            });

            return data;
        } catch (error) {
            console.error('投稿送信エラー:', error);
            this.lastError = error.message;
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    // 投稿一覧を取得
    async getPosts() {
        try {
            const data = await this.apiCall('/board/get', {
                method: 'GET'
            });

            // API全体のレスポンスを返す（posts配列 + totalPosts）
            return data;
        } catch (error) {
            console.error('❌ 投稿取得エラー:', error);
            this.lastError = error.message;
            
            // エラー時は空のデータを返す
            return {
                posts: [],
                totalPosts: 0,
                count: 0,
                lastUpdated: new Date().toISOString()
            };
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
const boardSystem = new BoardSystem();

// ランキングダッシュボードの表示
async function showRankingDashboard() {
    rankingModal.style.display = 'block';
    await updateRankingDisplay();
}

// ランキングダッシュボードを閉じる
function closeRankingDashboard() {
    rankingModal.style.display = 'none';
}

// 表示状態をリセット
function resetRankingDisplayState() {
    rankingLoading.style.display = 'none';
    rankingError.style.display = 'none';
    rankingTableBody.style.display = 'none';
    rankingEmpty.style.display = 'none';
}

// ランキング表示を更新
async function updateRankingDisplay() {
    // 表示状態をリセット
    resetRankingDisplayState();
    
    // ローディング表示
    rankingLoading.style.display = 'block';
    
    try {
        const data = await rankingSystem.getRankings();
        
        // データ構造を確認（APIレスポンス全体 vs ランキング配列のみ）
        const rankings = Array.isArray(data) ? data : data.rankings || [];
        const totalParticipants = data.totalParticipants || 0;
        
        // ローディングを非表示
        rankingLoading.style.display = 'none';
        
        if (rankings.length === 0) {
            rankingEmpty.style.display = 'block';
            rankingUpdateTime.textContent = '--';
            totalParticipantsElement.textContent = totalParticipants || '--';
            return;
        }

        rankingTableBody.style.display = 'table-row-group';
        
        // テーブルの内容をクリア
        rankingTableBody.innerHTML = '';
        
        // ランキングデータを表示
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
        
        // 最終更新時刻と参加者数を設定
        const now = new Date();
        rankingUpdateTime.textContent = now.toLocaleString('ja-JP');
        totalParticipantsElement.textContent = totalParticipants;
        
    } catch (error) {
        // ローディングを非表示
        rankingLoading.style.display = 'none';
        
        // エラー表示
        rankingError.style.display = 'block';
        rankingErrorMessage.textContent = error.message || 'ランキングの読み込みに失敗しました';
        
        console.error('ランキング表示エラー:', error);
    }
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 文字数カウンター更新関数
function updateCharCounter(input, counter, maxLength) {
    const currentLength = input.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    
    // 色の変更
    counter.classList.remove('warning', 'danger');
    if (currentLength >= maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (currentLength >= maxLength * 0.7) {
        counter.classList.add('warning');
    }
}

// 効果音を作成する関数
function playSound(frequency, duration, type = 'sine') {
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
}

// 正解音
function playCorrectSound() {
    playSound(523, 0.1); // C5
    setTimeout(() => playSound(659, 0.1), 100); // E5
    setTimeout(() => playSound(784, 0.2), 200); // G5
}

// 不正解音
function playIncorrectSound() {
    playSound(300, 0.3, 'sawtooth');
}

// レベルアップ音
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

// レベルごとのハイスコアを取得
function getHighScoreForLevel(level) {
    const key = `primeGameHighScore_${level}`;
    return parseInt(localStorage.getItem(key)) || 0;
}

// レベルごとのハイスコアを保存
function saveHighScoreForLevel(level, score) {
    const key = `primeGameHighScore_${level}`;
    localStorage.setItem(key, score);
}

// ハイスコア表示を更新
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

// ゲームオーバー処理
async function gameOver() {
    isGameActive = false;
    gameContent.classList.remove('active');
    gameOverScreen.style.display = 'block';
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
            
            // エラーの詳細を表示（レート制限の場合など）
            if (error.message.includes('1分間に1回')) {
                gameOverMessage.textContent += '（連続送信制限）';
            }
        }
    }
    
    // ゲームオーバー音
    playSound(200, 0.5, 'sawtooth');
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
    
    // プログレスバー更新
    questionsAnswered++;
    const progress = Math.min((questionsAnswered / 20) * 100, 100);
    progressBar.style.width = progress + '%';
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
    gameStartTime = new Date(); // ゲーム開始時間を記録
    scoreElement.textContent = score;
    streakElement.textContent = streak;
    
    startBtn.style.display = 'none';
    backToLevelBtn.style.display = 'none'; // レベル選択に戻るボタンも非表示
    levelSelection.style.display = 'none';
    userInfoForm.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContent.classList.add('active');
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    
    updateHighScoreDisplay();
    updateLivesDisplay();
    showNewNumber();
}

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
        
        // レベル選択を非表示
        levelSelection.style.display = 'none';
        
        // 上級レベルの場合、ユーザー情報入力フォームを表示
        if (selectedLevel === 'hard') {
            userInfoForm.style.display = 'block';
            startBtn.textContent = '上級でスタート！';
        } else {
            userInfoForm.style.display = 'none';
            startBtn.textContent = `${button.querySelector('.level-name').textContent}でスタート！`;
        }
        
        // ランキングボタンは常に表示（位置が固定なので表示制御不要）
        
        startBtn.style.display = 'block';
        backToLevelBtn.style.display = 'block'; // レベル選択に戻るボタンも表示
    });
});

// イベントリスナーの設定
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    levelSelection.style.display = 'block';
    userInfoForm.style.display = 'none';
    startBtn.style.display = 'none'; // スタートボタンを非表示
    backToLevelBtn.style.display = 'none'; // レベル選択に戻るボタンも非表示
    // ランキングボタンは常に表示のため、非表示にしない
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

// レベル選択に戻るボタンのイベントリスナー
backToLevelBtn.addEventListener('click', () => {
    // レベル選択画面に戻る
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

// ランキングダッシュボードのイベントリスナー
rankingDashboardBtn.addEventListener('click', showRankingDashboard);
closeRankingBtn.addEventListener('click', closeRankingDashboard);

// モーダルの外側をクリックしたときに閉じる
rankingModal.addEventListener('click', (e) => {
    if (e.target === rankingModal) {
        closeRankingDashboard();
    }
});

// ランキング再試行ボタン
rankingRetryBtn.addEventListener('click', async () => {
    await updateRankingDisplay();
});

// 文字数カウンターのイベントリスナー
userAffiliationInput.addEventListener('input', () => {
    updateCharCounter(userAffiliationInput, affiliationCounter, 10);
});

userNicknameInput.addEventListener('input', () => {
    updateCharCounter(userNicknameInput, nicknameCounter, 10);
});

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

// タッチデバイス用の処理（ボタンの反応を良くする）
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

/* ========================================
   掲示板関連の機能
   ======================================== */

// 投稿表示の状態をリセット
function resetPostsDisplayState() {
    postsLoading.style.display = 'none';
    postsError.style.display = 'none';
    postsEmpty.style.display = 'none';
    loadMoreContainer.style.display = 'none';
}

// 投稿一覧を更新
async function updatePostsDisplay() {
    // 表示状態をリセット
    resetPostsDisplayState();
    
    // ローディング表示
    postsLoading.style.display = 'block';
    
    try {
        const data = await boardSystem.getPosts();
        
        // データ構造を確認
        const posts = Array.isArray(data) ? data : data.posts || [];
        const totalPosts = data.totalPosts || 0;
        
        // ローディングを非表示
        postsLoading.style.display = 'none';
        
        if (posts.length === 0) {
            postsEmpty.style.display = 'block';
            totalPostsElement.textContent = totalPosts || '0';
            return;
        }

        // 全投稿データを保存
        allPosts = posts;
        displayedPostsCount = 0;
        
        // 投稿リストをクリア
        postsList.innerHTML = '';
        
        // 初期投稿を表示
        displayMorePosts();
        
        // 総投稿数を更新
        totalPostsElement.textContent = totalPosts;
        
    } catch (error) {
        console.error('投稿取得エラー:', error);
        postsLoading.style.display = 'none';
        postsError.style.display = 'block';
        postsErrorMessage.textContent = error.message || '投稿の取得に失敗しました';
    }
}

// 段階的に投稿を表示
function displayMorePosts() {
    const startIndex = displayedPostsCount;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, allPosts.length);
    
    // 新しい投稿を追加表示
    for (let i = startIndex; i < endIndex; i++) {
        const post = allPosts[i];
        const postElement = createPostElement(post, i + 1);
        
        // モバイル対応: 確実に表示されるよう明示的にスタイル設定
        postElement.style.display = 'block';
        postElement.style.visibility = 'visible';
        postElement.style.position = 'relative';
        
        postsList.appendChild(postElement);
    }
    
    // 表示済み投稿数を更新
    displayedPostsCount = endIndex;
    
    // 「もっと見る」ボタンの表示制御
    updateLoadMoreButton();
    
    // モバイルデバッグ: 投稿リストの高さを確認
    if (window.innerWidth <= 768) {
        console.log(`モバイル表示: ${displayedPostsCount}/${allPosts.length}件表示済み`);
    }
}

// 「もっと見る」ボタンの表示制御
function updateLoadMoreButton() {
    const remainingPosts = allPosts.length - displayedPostsCount;
    
    if (remainingPosts > 0) {
        // まだ表示していない投稿がある場合
        loadMoreContainer.style.display = 'block';
        loadMoreCount.textContent = `(残り ${remainingPosts}件)`;
        loadMoreBtn.disabled = false;
    } else {
        // 全て表示済みの場合
        loadMoreContainer.style.display = 'none';
    }
}

// 投稿要素を作成
function createPostElement(post, index) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-item';
    
    // モバイル対応: 確実な表示のための明示的スタイル設定
    postDiv.style.cssText = `
        display: block !important;
        visibility: visible !important;
        position: relative !important;
        width: 100% !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
    `;
    
    // 投稿時刻をフォーマット
    const timestamp = new Date(post.timestamp);
    const formattedTime = timestamp.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // 管理者投稿の場合のクラス追加
    const authorClass = post.isAdmin ? 'post-author admin' : 'post-author';
    
    postDiv.innerHTML = `
        <div class="post-header">
            <span class="${authorClass}">${escapeHtml(post.nickname)}</span>
            <span class="post-timestamp">${formattedTime}</span>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
    `;
    
    return postDiv;
}

// HTMLエスケープ関数（フロントエンド用）
function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 投稿を送信
async function submitPost() {
    const nickname = postNicknameInput.value.trim();
    const content = postContentInput.value.trim();
    
    // バリデーション
    if (!nickname || nickname.length < 1 || nickname.length > 15) {
        alert('ニックネームは1-15文字で入力してください');
        return;
    }
    
    if (!content || content.length < 1 || content.length > 300) {
        alert('感想・質問は1-300文字で入力してください');
        return;
    }
    
    // ボタンを無効化
    submitPostBtn.disabled = true;
    submitPostBtn.textContent = '投稿中...';
    
    try {
        await boardSystem.submitPost(nickname, content);
        
        // 成功時の処理
        alert('投稿が送信されました！ご意見ありがとうございます！');
        postNicknameInput.value = '';
        postContentInput.value = '';
        updateCharCounterForPost(postNicknameInput, postNicknameCounter, 15);
        updateCharCounterForPost(postContentInput, postContentCounter, 300);
        
        // 投稿一覧を更新
        await updatePostsDisplay();
        
    } catch (error) {
        alert(`投稿に失敗しました: ${error.message}`);
        console.error('投稿送信エラー:', error);
    } finally {
        // ボタンを再有効化
        submitPostBtn.disabled = false;
        submitPostBtn.textContent = '投稿する';
    }
}

// 文字数カウンター更新関数（拡張版）
function updateCharCounterForPost(input, counter, maxLength) {
    const currentLength = input.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.classList.remove('warning', 'danger');
    if (currentLength >= maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (currentLength >= maxLength * 0.7) {
        counter.classList.add('warning');
    }
}

/* ========================================
   掲示板イベントリスナー
   ======================================== */

// 投稿送信ボタン
submitPostBtn.addEventListener('click', submitPost);

// エンターキーでの投稿送信（Ctrl+Enter）
postContentInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        submitPost();
    }
});

// 文字数カウンター
postNicknameInput.addEventListener('input', () => {
    updateCharCounterForPost(postNicknameInput, postNicknameCounter, 15);
});

postContentInput.addEventListener('input', () => {
    updateCharCounterForPost(postContentInput, postContentCounter, 300);
});

// 投稿再試行ボタン
postsRetryBtn.addEventListener('click', updatePostsDisplay);

// もっと見るボタン
loadMoreBtn.addEventListener('click', () => {
    loadMoreBtn.disabled = true;
    loadMoreBtn.querySelector('.load-more-text').textContent = '読み込み中...';
    
    // 少し遅延を入れてユーザー体験を向上
    setTimeout(() => {
        displayMorePosts();
        loadMoreBtn.querySelector('.load-more-text').textContent = 'もっと見る';
        loadMoreBtn.disabled = false;
    }, 300);
});

// ページ読み込み時に投稿一覧を取得
document.addEventListener('DOMContentLoaded', () => {
    updatePostsDisplay();
}); 