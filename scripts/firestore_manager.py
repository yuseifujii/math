"""
Mt.MATH - Firestore管理モジュール
記事とトピックのCRUD操作を管理
"""

from typing import List, Optional, Dict, Any
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import firestore
from datetime import datetime
import logging

from scripts.config import config
from scripts.data_models import MathArticle, MathTopic

logger = logging.getLogger(__name__)

class FirestoreManager:
    """Firestore データベース管理クラス"""
    
    def __init__(self):
        self.db = config.db
        self.articles_collection = config.articles_collection
        self.topics_collection = config.math_topics_collection
    
    # === 記事管理 ===
    
    def save_article(self, article: MathArticle, allow_overwrite: bool = False) -> str:
        """記事をFirestoreに保存"""
        try:
            # 重複チェック
            if not allow_overwrite:
                existing = self.get_article(article.slug)
                if existing:
                    raise ValueError(f"記事が既に存在します: {article.slug} (タイトル: {existing.title})")
            
            article.updated_at = datetime.now()
            doc_ref = self.db.collection(self.articles_collection).document(article.slug)
            doc_ref.set(article.to_dict())
            
            logger.info(f"記事を保存しました: {article.title}")
            return article.slug
            
        except Exception as e:
            logger.error(f"記事保存エラー: {e}")
            raise
    
    def check_topic_exists(self, topic_name: str, category: str) -> bool:
        """トピックが既に記事化されているかチェック"""
        try:
            query = (self.db.collection(self.articles_collection)
                    .where(filter=FieldFilter("category", "==", category))
                    .where(filter=FieldFilter("title", ">=", topic_name))
                    .where(filter=FieldFilter("title", "<=", topic_name + "\uf8ff"))
                    .limit(1))
            
            docs = list(query.stream())
            return len(docs) > 0
            
        except Exception as e:
            logger.error(f"重複チェックエラー: {e}")
            logger.info("Firebaseインデックスが必要です。Firebaseコンソールでインデックスを作成してください。")
            return False
    
    def get_article(self, slug: str) -> Optional[MathArticle]:
        """スラッグで記事を取得"""
        try:
            doc_ref = self.db.collection(self.articles_collection).document(slug)
            doc = doc_ref.get()
            
            if doc.exists:
                return MathArticle.from_dict(doc.to_dict())
            return None
            
        except Exception as e:
            logger.error(f"記事取得エラー: {e}")
            return None
    
    def get_articles_by_category(self, category: str, limit: int = 20) -> List[MathArticle]:
        """カテゴリ別に記事を取得"""
        try:
            query = (self.db.collection(self.articles_collection)
                    .where(filter=FieldFilter("category", "==", category))
                    .where(filter=FieldFilter("status", "==", "published"))
                    .order_by("created_at", direction="DESCENDING")
                    .limit(limit))
            
            docs = query.stream()
            return [MathArticle.from_dict(doc.to_dict()) for doc in docs]
            
        except Exception as e:
            logger.error(f"カテゴリ別記事取得エラー: {e}")
            return []
    
    def get_all_published_articles(self, limit: int = 50) -> List[MathArticle]:
        """公開済み記事を全て取得"""
        try:
            query = (self.db.collection(self.articles_collection)
                    .where(filter=FieldFilter("status", "==", "published"))
                    .order_by("created_at", direction="DESCENDING")
                    .limit(limit))
            
            docs = query.stream()
            return [MathArticle.from_dict(doc.to_dict()) for doc in docs]
            
        except Exception as e:
            logger.error(f"全記事取得エラー: {e}")
            return []
    
    def search_articles(self, keyword: str, limit: int = 10) -> List[MathArticle]:
        """キーワードで記事を検索（簡易実装）"""
        try:
            # タイトルによる部分検索
            query = (self.db.collection(self.articles_collection)
                    .where(filter=FieldFilter("status", "==", "published"))
                    .limit(limit * 3))  # 多めに取得してフィルタリング
            
            docs = query.stream()
            articles = []
            
            for doc in docs:
                article = MathArticle.from_dict(doc.to_dict())
                if (keyword.lower() in article.title.lower() or 
                    keyword.lower() in article.summary.lower() or
                    keyword in article.tags):
                    articles.append(article)
                    if len(articles) >= limit:
                        break
            
            return articles
            
        except Exception as e:
            logger.error(f"記事検索エラー: {e}")
            return []
    
    # === トピック管理 ===
    
    def save_topic(self, topic: MathTopic) -> str:
        """トピックをFirestoreに保存"""
        try:
            # ランダムIDで新規ドキュメント作成
            doc_ref = self.db.collection(self.topics_collection).document()
            topic.topic_id = doc_ref.id  # 生成されたIDを記録
            doc_ref.set(topic.to_dict())
            logger.info(f"トピックを保存しました: {topic.name} (ID: {doc_ref.id})")
            return doc_ref.id
        except Exception as e:
            logger.error(f"トピック保存エラー: {e}")
            raise
    
    def get_ungenerated_topics(self, limit: int = 10) -> List[MathTopic]:
        """未生成のトピックを取得（優先度順）"""
        try:
            query = (self.db.collection(self.topics_collection)
                    .where(filter=FieldFilter("article_generated", "==", False))
                    .order_by("priority", direction=firestore.Query.DESCENDING)
                    .order_by("niche_score", direction=firestore.Query.DESCENDING)
                    .limit(limit))
            
            docs = query.stream()
            topics = []
            for doc in docs:
                data = doc.to_dict()
                data['topic_id'] = doc.id  # ドキュメントIDを記録
                topics.append(MathTopic(**data))
            return topics
            
        except Exception as e:
            logger.error(f"未生成トピック取得エラー: {e}")
            return []
    
    def update_topic_status(self, topic_id: str, generated: bool, article_slug: str = None):
        """トピックの生成ステータスを更新"""
        try:
            doc_ref = self.db.collection(self.topics_collection).document(topic_id)
            update_data = {"article_generated": generated}
            if article_slug:
                update_data["article_slug"] = article_slug
            doc_ref.update(update_data)
            logger.info(f"トピック ID '{topic_id}' のステータスを更新しました。")
        except Exception as e:
            logger.error(f"トピックステータス更新エラー (ID: {topic_id}): {e}")
            raise

    def mark_topic_as_generated(self, topic_id: str, article_slug: str):
        """トピックを生成済みとしてマーク（互換性のため）"""
        self.update_topic_status(topic_id, True, article_slug)
    
    # === 統計情報 ===
    
    def get_stats(self) -> Dict[str, Any]:
        """サイト統計情報を取得"""
        try:
            # 記事数
            articles_count = len(list(self.db.collection(self.articles_collection)
                                    .where(filter=FieldFilter("status", "==", "published"))
                                    .stream()))
            
            # カテゴリ別記事数
            categories = {}
            articles = self.get_all_published_articles()
            for article in articles:
                categories[article.category] = categories.get(article.category, 0) + 1
            
            return {
                "total_articles": articles_count,
                "categories": categories,
                "last_updated": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"統計情報取得エラー: {e}")
            return {}

# グローバルインスタンス
firestore_manager = FirestoreManager()