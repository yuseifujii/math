/**
 * Mt.MATH - モダンホームページJavaScript
 * Firebase連携、記事読み込み、インタラクション制御
 */

class ModernHomePage {
    constructor() {
        this.currentCategory = 'all';
        this.articlesPerPage = 6;
        this.currentPage = 1;
        this.allArticles = [];
        this.init();
    }

    async init() {
        // Firebase初期化待機
        await this.waitForFirebase();
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 記事読み込み
        await this.loadArticles();
        
        // 記事数更新
        this.updateArticleCount();
        
        // ナビゲーション初期化
        this.initNavigation();
    }

    /**
     * Firebase初期化待機
     */
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebase && window.firebase.db) {
                    console.log('✅ Firebase 初期化完了');
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // カテゴリタブ
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterByCategory(category);
            });
        });

        // さらに読み込むボタン
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreArticles();
            });
        }

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

    /**
     * ナビゲーション初期化
     */
    initNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });

            // メニューリンククリック時にメニューを閉じる
            navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                });
            });
        }
    }

    /**
     * 記事読み込み
     */
    async loadArticles() {
        try {
            const { db, collection, query, where, orderBy, getDocs } = window.firebase;
            
            const articlesQuery = query(
                collection(db, 'articles'),
                where('status', '==', 'published'),
                orderBy('created_at', 'desc')
            );

            const querySnapshot = await getDocs(articlesQuery);
            this.allArticles = [];

            querySnapshot.forEach((doc) => {
                this.allArticles.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ ${this.allArticles.length}件の記事を読み込みました`);
            this.displayArticles();

        } catch (error) {
            console.error('記事読み込みエラー:', error);
            this.showArticleError('記事の読み込みに失敗しました');
        }
    }

    /**
     * 記事表示
     */
    displayArticles() {
        const container = document.getElementById('articles-grid');
        const filteredArticles = this.getFilteredArticles();
        const articlesToShow = filteredArticles.slice(0, this.currentPage * this.articlesPerPage);

        container.innerHTML = '';

        if (articlesToShow.length === 0) {
            container.innerHTML = `
                <div class="no-articles">
                    <h3>記事が見つかりません</h3>
                    <p>選択されたカテゴリには記事がありません。</p>
                </div>
            `;
            return;
        }

        articlesToShow.forEach(article => {
            const articleCard = this.createArticleCard(article);
            container.appendChild(articleCard);
        });

        // さらに読み込むボタンの表示制御
        this.updateLoadMoreButton(filteredArticles.length);
    }

    /**
     * 記事カード作成
     */
    createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'article-card clickable-card';
        
        const categoryName = this.getCategoryName(article.category);
        const truncatedSummary = this.truncateText(article.summary, 120);
        const tagsHtml = article.tags.slice(0, 3).map(tag => 
            `<span class="article-tag">${tag}</span>`
        ).join('');

        card.innerHTML = `
            <div class="article-meta-top">
                <span class="article-category">${categoryName}</span>
                <div class="article-difficulty">
                    <span class="difficulty-badge">難易度 ${article.difficulty_level}/10</span>
                    <span class="niche-badge">ニッチ度 ${article.niche_score}/10</span>
                </div>
            </div>
            <h3>${article.title}</h3>
            <p>${truncatedSummary}</p>
            <div class="article-footer">
                <div class="article-tags">${tagsHtml}</div>
            </div>
        `;

        // カード全体をクリック可能に
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `article.html?slug=${article.id}`;
        });

        return card;
    }

    /**
     * カテゴリフィルタリング
     */
    filterByCategory(category) {
        this.currentCategory = category;
        this.currentPage = 1;

        // タブの状態更新
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // 記事再表示
        this.displayArticles();
    }

    /**
     * フィルタリングされた記事取得
     */
    getFilteredArticles() {
        if (this.currentCategory === 'all') {
            return this.allArticles;
        }
        return this.allArticles.filter(article => article.category === this.currentCategory);
    }

    /**
     * さらに記事読み込み
     */
    loadMoreArticles() {
        this.currentPage++;
        this.displayArticles();
    }

    /**
     * さらに読み込むボタン更新
     */
    updateLoadMoreButton(totalArticles) {
        const loadMoreBtn = document.getElementById('load-more-btn');
        const currentlyShowing = this.currentPage * this.articlesPerPage;

        if (currentlyShowing >= totalArticles) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-flex';
        }
    }

    /**
     * 記事数更新
     */
    updateArticleCount() {
        const countElement = document.getElementById('article-count');
        if (countElement) {
            countElement.textContent = this.allArticles.length;
        }
    }

    /**
     * カテゴリ名を日本語に変換
     */
    getCategoryName(category) {
        const categoryMap = {
            'algebra': '代数学',
            'analysis': '解析学',
            'number_theory': '整数論',
            'probability': '確率論・統計学',
            'combinatorics': '組合せ論',
            'logic': '数理論理学',
            'set_theory': '集合論',
            'calculus': '微積分学',
            'linear_algebra': '線形代数',
            'others': 'その他'
        };
        return categoryMap[category] || category;
    }

    /**
     * テキスト切り詰め
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * 記事エラー表示
     */
    showArticleError(message) {
        const container = document.getElementById('articles-grid');
        container.innerHTML = `
            <div class="article-error">
                <h3>⚠️ エラー</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-outline">
                    再読み込み
                </button>
            </div>
        `;
    }
}

// スクロールアニメーション
class ScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        // スクロール時のヘッダー背景変更
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

        // 要素の表示アニメーション
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

        // アニメーション対象要素
        document.querySelectorAll('.game-card, .article-card, .feature-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    new ModernHomePage();
    new ScrollAnimations();
    
    console.log('🚀 Mt.MATH モダンサイト初期化完了');
});