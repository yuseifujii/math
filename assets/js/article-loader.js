/**
 * Mt.MATH - 記事動的読み込みスクリプト
 * Firebase Firestoreから記事データを取得して表示
 */

class ArticleLoader {
    constructor() {
        this.currentSlug = this.getSlugFromURL();
        this.init();
    }

    /**
     * URLからスラッグを取得
     */
    getSlugFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('slug');
    }

    /**
     * 初期化
     */
    async init() {
        if (!this.currentSlug) {
            this.showError('記事のスラッグが指定されていません');
            return;
        }

        try {
            // Firebase初期化待機
            await this.waitForFirebase();
            
            // 記事読み込み
            await this.loadArticle(this.currentSlug);
            
        } catch (error) {
            console.error('記事読み込みエラー:', error);
            this.showError('記事の読み込みに失敗しました');
        }
    }

    /**
     * Firebase初期化待機
     */
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebase && window.firebase.db) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    /**
     * 記事を読み込み
     */
    async loadArticle(slug) {
        const { db, doc, getDoc } = window.firebase;
        
        try {
            // Firestoreから記事取得
            const docRef = doc(db, 'articles', slug);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const articleData = docSnap.data();
                this.displayArticle(articleData);
                
                // 関連記事読み込み
                await this.loadRelatedArticles(articleData.category, articleData.tags);
                
            } else {
                this.showError('記事が見つかりません');
            }
            
        } catch (error) {
            console.error('Firestore読み込みエラー:', error);
            this.showError('データベースへの接続に失敗しました');
        }
    }

    /**
     * 記事を表示
     */
    displayArticle(article) {
        // ローディング非表示
        document.getElementById('loading-section').style.display = 'none';
        
        // メタデータ表示
        document.getElementById('article-title').textContent = article.title;
        document.getElementById('article-title-breadcrumb').textContent = article.title;
        document.getElementById('article-category').textContent = this.getCategoryName(article.category);
        document.getElementById('article-difficulty').textContent = article.difficulty_level;
        document.getElementById('article-niche').textContent = article.niche_score;
        document.getElementById('article-author').textContent = article.author;
        // Summary内の数式をMathJax処理するためinnerHTML使用
        document.getElementById('article-summary').innerHTML = article.summary;
        
        // タグ表示
        this.displayTags(article.tags);
        
        // メインコンテンツ表示
        document.getElementById('article-content-html').innerHTML = article.content_html;
        
        // タイトル更新
        document.title = `${article.title} | Mt.MATH`;
        
        // 記事セクション表示
        document.getElementById('article-section').style.display = 'block';
        
        // MathJax再レンダリング
        if (window.MathJax) {
            MathJax.typesetPromise();
        }
        
        console.log('✅ 記事表示完了:', article.title);
    }

    /**
     * タグ表示
     */
    displayTags(tags) {
        const container = document.getElementById('article-tags-container');
        container.innerHTML = '';
        
        if (tags && tags.length > 0) {
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                container.appendChild(tagElement);
            });
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
     * 関連記事読み込み
     */
    async loadRelatedArticles(category, tags) {
        try {
            const { db, collection, query, where, orderBy, limit, getDocs } = window.firebase;
            
            // 同じカテゴリの記事を取得
            const q = query(
                collection(db, 'articles'),
                where('category', '==', category),
                where('status', '==', 'published'),
                orderBy('created_at', 'desc'),
                limit(5)
            );
            
            const querySnapshot = await getDocs(q);
            const relatedArticles = [];
            
            querySnapshot.forEach((doc) => {
                if (doc.id !== this.currentSlug) { // 現在の記事は除外
                    relatedArticles.push({
                        slug: doc.id,
                        ...doc.data()
                    });
                }
            });
            
            this.displayRelatedArticles(relatedArticles.slice(0, 3)); // 最大3件
            
        } catch (error) {
            console.error('関連記事読み込みエラー:', error);
        }
    }

    /**
     * 関連記事表示
     */
    displayRelatedArticles(articles) {
        const container = document.getElementById('related-articles-list');
        container.innerHTML = '';
        
        if (articles.length === 0) {
            container.innerHTML = '<p>関連記事はありません。</p>';
            return;
        }
        
        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'related-article-item';
            articleElement.innerHTML = `
                <h4><a href="article.html?slug=${article.slug}">${article.title}</a></h4>
                <p>${article.summary}</p>
                <div class="article-meta-small">
                    <span>難易度: ${article.difficulty_level}/10</span>
                    <span>ニッチ度: ${article.niche_score}/10</span>
                </div>
            `;
            container.appendChild(articleElement);
        });
    }

    /**
     * エラー表示
     */
    showError(message) {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('article-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'block';
        
        const errorMessageElement = document.querySelector('#error-section .error-message p');
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
        }
    }
}

// ページ読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    new ArticleLoader();
});