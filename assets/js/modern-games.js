/**
 * Mt.MATH - モダンゲームページJavaScript
 */

class ModernGamesPage {
    constructor() {
        this.currentRankingGame = 'calculation';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRankings();
        this.animateStats();
    }

    setupEventListeners() {
        // ランキングタブ
        document.querySelectorAll('.ranking-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const game = e.target.dataset.game;
                this.switchRanking(game);
            });
        });

        // スムーススクロール
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    switchRanking(game) {
        this.currentRankingGame = game;

        // タブの状態更新
        document.querySelectorAll('.ranking-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-game="${game}"]`).classList.add('active');

        // ランキング読み込み
        this.loadRankings();
    }

    loadRankings() {
        const container = document.getElementById('ranking-content');
        
        // ローディング表示
        container.innerHTML = `
            <div class="ranking-loading">
                <div class="spinner"></div>
                <p>ランキングを読み込み中...</p>
            </div>
        `;

        // ダミーデータ（実際はMt.Math games.jsから取得）
        setTimeout(() => {
            const rankings = this.getDummyRankings(this.currentRankingGame);
            this.displayRankings(rankings);
        }, 1000);
    }

    getDummyRankings(game) {
        const games = {
            calculation: [
                { rank: 1, name: 'MathMaster', score: 4567, date: '2025-01-04' },
                { rank: 2, name: 'NumberNinja', score: 4234, date: '2025-01-03' },
                { rank: 3, name: 'CalcKing', score: 3987, date: '2025-01-04' },
                { rank: 4, name: 'SpeedSolver', score: 3765, date: '2025-01-02' },
                { rank: 5, name: 'QuickMath', score: 3543, date: '2025-01-04' }
            ],
            sequence: [
                { rank: 1, name: 'PatternPro', score: 2890, date: '2025-01-04' },
                { rank: 2, name: 'SequenceSeeker', score: 2654, date: '2025-01-03' },
                { rank: 3, name: 'LogicLord', score: 2432, date: '2025-01-04' },
                { rank: 4, name: 'TrendTracker', score: 2198, date: '2025-01-02' },
                { rank: 5, name: 'SeriesExpert', score: 1987, date: '2025-01-04' }
            ]
        };

        return games[game] || games.calculation;
    }

    displayRankings(rankings) {
        const container = document.getElementById('ranking-content');
        
        const rankingHtml = `
            <div class="ranking-table">
                <div class="ranking-header">
                    <span class="rank-col">順位</span>
                    <span class="name-col">プレイヤー名</span>
                    <span class="score-col">スコア</span>
                    <span class="date-col">日付</span>
                </div>
                ${rankings.map(player => `
                    <div class="ranking-row ${player.rank <= 3 ? 'top-rank' : ''}" data-rank="${player.rank}">
                        <span class="rank-col">
                            ${player.rank <= 3 ? this.getRankIcon(player.rank) : player.rank}
                        </span>
                        <span class="name-col">${player.name}</span>
                        <span class="score-col">${player.score.toLocaleString()}</span>
                        <span class="date-col">${player.date}</span>
                    </div>
                `).join('')}
            </div>
            <div class="ranking-footer">
                <p>ランキングは毎日更新されます</p>
                <button class="btn btn-outline" onclick="location.reload()">
                    最新データを取得
                </button>
            </div>
        `;

        container.innerHTML = rankingHtml;

        // アニメーション
        setTimeout(() => {
            document.querySelectorAll('.ranking-row').forEach((row, index) => {
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '1';
                    row.style.transform = 'translateX(0)';
                }, index * 100);
            });
        }, 100);
    }

    getRankIcon(rank) {
        const icons = {
            1: '🥇',
            2: '🥈', 
            3: '🥉'
        };
        return icons[rank] || rank;
    }

    animateStats() {
        // 統計数値のアニメーション
        this.animateNumber('total-players', 250, 2000);
        this.animateNumber('total-games', 1247, 2500);
    }

    animateNumber(elementId, target, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    }
}

// ランキング表示関数（グローバル）
function showRanking(game) {
    const rankingSection = document.getElementById('rankings');
    
    // タブを切り替え
    if (window.gamesPage) {
        window.gamesPage.switchRanking(game);
    }
    
    // スクロール
    rankingSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// スクロールアニメーション
class GamesScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        // ヘッダー背景変更
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 100) {
                navbar.style.background = 'rgba(10, 22, 49, 0.95)';
                navbar.style.backdropFilter = 'blur(15px)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.1)';
                navbar.style.backdropFilter = 'blur(10px)';
            }
        });

        // 要素のフェードイン
        this.observeElements();
    }

    observeElements() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.game-card, .feature-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.gamesPage = new ModernGamesPage();
    new GamesScrollAnimations();
    
    console.log('🎮 Mt.MATH ゲームページ初期化完了');
});