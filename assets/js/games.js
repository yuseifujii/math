/**
 * 数学ゲーム用JavaScript
 * ランキング機能とゲーム共通機能を提供
 */

// ゲーム結果を保存するためのローカルストレージキー
const RANKINGS_KEY = 'mtmath_rankings';

/**
 * ランキングデータを取得
 */
function getRankings() {
    const stored = localStorage.getItem(RANKINGS_KEY);
    return stored ? JSON.parse(stored) : [];
}

/**
 * ランキングデータを保存
 */
function saveRankings(rankings) {
    localStorage.setItem(RANKINGS_KEY, JSON.stringify(rankings));
}

/**
 * 新しいスコアを追加
 */
function addScore(playerName, gameName, score) {
    const rankings = getRankings();
    const newEntry = {
        id: Date.now(),
        playerName: playerName,
        gameName: gameName,
        score: score,
        date: new Date().toISOString().split('T')[0]
    };
    
    rankings.push(newEntry);
    
    // ゲーム別にソートし、上位10位まで保持
    rankings.sort((a, b) => b.score - a.score);
    
    saveRankings(rankings);
    return newEntry;
}

/**
 * ランキング表示を更新
 */
function displayRankings() {
    const rankingsContainer = document.getElementById('rankings');
    if (!rankingsContainer) return;
    
    const rankings = getRankings();
    
    if (rankings.length === 0) {
        rankingsContainer.innerHTML = '<p>まだランキングデータがありません。ゲームをプレイしてスコアを記録しましょう！</p>';
        return;
    }
    
    // ゲーム別にグループ化
    const gameGroups = {};
    rankings.forEach(entry => {
        if (!gameGroups[entry.gameName]) {
            gameGroups[entry.gameName] = [];
        }
        gameGroups[entry.gameName].push(entry);
    });
    
    let html = '';
    Object.keys(gameGroups).forEach(gameName => {
        const gameRankings = gameGroups[gameName]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // 上位10位まで
        
        html += `
            <h4>${gameName} - ランキング</h4>
            <table class="ranking-table">
                <thead>
                    <tr>
                        <th>順位</th>
                        <th>プレイヤー名</th>
                        <th>スコア</th>
                        <th>日付</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        gameRankings.forEach((entry, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${entry.playerName}</td>
                    <td>${entry.score}</td>
                    <td>${entry.date}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
    });
    
    rankingsContainer.innerHTML = html;
}

/**
 * プレイヤー名を取得（簡易実装）
 */
function getPlayerName() {
    let playerName = localStorage.getItem('mtmath_player_name');
    if (!playerName) {
        playerName = prompt('プレイヤー名を入力してください（ランキングに表示されます）:');
        if (playerName && playerName.trim()) {
            playerName = playerName.trim().substring(0, 20); // 20文字まで
            localStorage.setItem('mtmath_player_name', playerName);
        } else {
            playerName = 'ゲスト' + Math.floor(Math.random() * 1000);
        }
    }
    return playerName;
}

/**
 * ゲーム終了時のスコア登録
 */
function submitScore(gameName, score) {
    const playerName = getPlayerName();
    const entry = addScore(playerName, gameName, score);
    
    alert(`スコアが登録されました！\nプレイヤー: ${playerName}\nスコア: ${score}`);
    
    // ランキング表示を更新
    displayRankings();
    
    return entry;
}

/**
 * 初期化処理
 */
document.addEventListener('DOMContentLoaded', function() {
    displayRankings();
});

// グローバルに公開する関数
window.MtMathGames = {
    submitScore,
    getRankings,
    displayRankings,
    getPlayerName
};