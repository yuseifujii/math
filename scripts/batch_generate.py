"""
Mt.MATH - 統合バッチ処理スクリプト
トピック生成 → 記事生成の完全自動化ワークフロー
"""

import sys
import argparse
import logging
from typing import List, Dict, Any
from datetime import datetime
import time

from scripts.config import config
from scripts.data_models import MathTopic, MathArticle, CATEGORY_MAP
from scripts.firestore_manager import firestore_manager
from scripts.topic_selector import TopicSelector
from scripts.article_generator_v2 import ArticleGenerator

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BatchGenerator:
    """統合バッチ処理クラス"""
    
    def __init__(self):
        self.topic_selector = TopicSelector()
        self.article_generator = ArticleGenerator()
        
        if not config.db or not config.gemini_model:
            raise ValueError("Firebase または Gemini API の初期化に失敗しました")
    
    def run_full_workflow(self, total_articles: int = 3, 
                         target_categories: List[str] = None) -> Dict[str, Any]:
        """完全ワークフロー実行"""
        
        logger.info(f"🚀 統合バッチ処理開始: {total_articles}記事生成")
        print(f"\n{'='*60}")
        print(f"🚀 Mt.MATH バッチ記事生成ワークフロー")
        print(f"📝 目標記事数: {total_articles}")
        print(f"📂 対象カテゴリ: {target_categories or '全て'}")
        print(f"{'='*60}")
        
        start_time = time.time()
        results = {
            "total_requested": total_articles,
            "topics_generated": 0,
            "articles_generated": 0,
            "successful_articles": [],
            "failed_articles": [],
            "execution_time": 0,
            "errors": []
        }
        
        try:
            # Step 1: 既存の未生成トピックをチェック
            existing_topics = self._get_ungenerated_topics(total_articles)
            needed_topics = max(0, total_articles - len(existing_topics))
            
            if needed_topics > 0:
                print(f"\n📋 新規トピック生成: {needed_topics}個")
                new_topics = self._generate_new_topics(needed_topics, target_categories)
                results["topics_generated"] = len(new_topics)
                existing_topics.extend(new_topics)
            else:
                print(f"\n📋 既存未生成トピック使用: {len(existing_topics)}個")
            
            # 実際に処理するトピック数を調整
            topics_to_process = existing_topics[:total_articles]
            
            # Step 2: 各トピックから記事生成
            print(f"\n📖 記事生成開始: {len(topics_to_process)}個")
            for i, topic in enumerate(topics_to_process, 1):
                try:
                    print(f"\n--- 記事 {i}/{len(topics_to_process)} ---")
                    article = self._generate_article_from_topic(topic)
                    
                    if article:
                        # Firestoreに保存
                        firestore_manager.save_article(article, allow_overwrite=True)
                        
                        # トピックを生成済みとしてマーク
                        topic_id = topic.topic_id or topic.name
                        firestore_manager.update_topic_status(
                            topic_id, 
                            generated=True, 
                            article_slug=article.slug
                        )
                        
                        results["successful_articles"].append({
                            "topic": topic.name,
                            "title": article.title,
                            "slug": article.slug,
                            "category": article.category,
                            "difficulty": article.difficulty_level,
                            "niche_score": article.niche_score,
                            "content_length": len(article.content_html)
                        })
                        
                        print(f"✅ 成功: {article.title}")
                        print(f"   📊 難易度: {article.difficulty_level}/10, ニッチ度: {article.niche_score}/10")
                        print(f"   📏 文字数: {len(article.content_html)}文字")
                        
                        results["articles_generated"] += 1
                        
                        # API制限対策: 少し待機
                        if i < len(topics_to_process):
                            print("   ⏳ 次の記事生成まで待機中...")
                            time.sleep(2)  # 2秒待機
                        
                    else:
                        raise ValueError("記事生成に失敗しました")
                        
                except Exception as e:
                    error_msg = f"記事生成エラー (トピック: {topic.name}): {e}"
                    logger.error(error_msg)
                    results["failed_articles"].append({
                        "topic": topic.name,
                        "error": str(e)
                    })
                    results["errors"].append(error_msg)
                    print(f"❌ 失敗: {topic.name} - {e}")
            
            # 完了レポート
            results["execution_time"] = time.time() - start_time
            self._print_final_report(results)
            
            return results
            
        except Exception as e:
            logger.error(f"バッチ処理エラー: {e}")
            results["errors"].append(str(e))
            results["execution_time"] = time.time() - start_time
            print(f"\n❌ バッチ処理が中断されました: {e}")
            return results
    
    def _get_ungenerated_topics(self, limit: int) -> List[MathTopic]:
        """未生成トピックを取得"""
        try:
            topics = firestore_manager.get_ungenerated_topics(limit)
            if topics:
                print(f"📋 既存未生成トピック: {len(topics)}個発見")
                for topic in topics:
                    print(f"   • {topic.name} (ニッチ度: {topic.niche_score})")
            return topics
        except Exception as e:
            logger.warning(f"未生成トピック取得エラー: {e}")
            return []
    
    def _generate_new_topics(self, count: int, 
                           target_categories: List[str] = None) -> List[MathTopic]:
        """新規トピック生成"""
        try:
            if not target_categories:
                target_categories = ["algebra", "analysis", "number_theory", "probability"]
            
            topics = self.topic_selector.generate_niche_topics(
                count=count, 
                target_categories=target_categories
            )
            
            # Firestoreに保存
            for topic in topics:
                firestore_manager.save_topic(topic)
                print(f"   ✅ トピック保存: {topic.name}")
            
            return topics
            
        except Exception as e:
            logger.error(f"新規トピック生成エラー: {e}")
            return []
    
    def _generate_article_from_topic(self, topic: MathTopic) -> MathArticle:
        """トピックから記事生成"""
        
        print(f"📝 記事生成中: {topic.name}")
        print(f"   カテゴリ: {CATEGORY_MAP.get(topic.category, topic.category)}")
        print(f"   タイトル: {topic.title}")
        
        try:
            article = self.article_generator.generate_article(
                topic=topic.name,
                category=topic.category,
                title=topic.title,
                summary=topic.summary,
                difficulty_level=topic.difficulty_level,
                niche_score=topic.niche_score,
                tags=topic.tags
            )
            
            return article
            
        except Exception as e:
            logger.error(f"記事生成エラー: {e}")
            raise
    
    def _print_final_report(self, results: Dict[str, Any]):
        """最終レポート表示"""
        
        print(f"\n{'='*60}")
        print(f"🎉 バッチ処理完了レポート")
        print(f"{'='*60}")
        print(f"⏱️  実行時間: {results['execution_time']:.1f}秒")
        print(f"📋 新規トピック生成: {results['topics_generated']}個")
        print(f"📖 記事生成成功: {results['articles_generated']}/{results['total_requested']}")
        print(f"❌ 失敗: {len(results['failed_articles'])}個")
        
        if results["successful_articles"]:
            print(f"\n✅ 成功した記事:")
            for article in results["successful_articles"]:
                print(f"   • {article['title']}")
                print(f"     スラッグ: {article['slug']}")
                print(f"     難易度: {article['difficulty']}/10, ニッチ度: {article['niche_score']}/10")
                print(f"     文字数: {article['content_length']}文字")
        
        if results["failed_articles"]:
            print(f"\n❌ 失敗した記事:")
            for failure in results["failed_articles"]:
                print(f"   • {failure['topic']}: {failure['error']}")
        
        if results["articles_generated"] > 0:
            print(f"\n🌐 記事確認URL:")
            for article in results["successful_articles"]:
                print(f"   http://localhost:8000/article.html?slug={article['slug']}")
            
            print(f"\n🏠 ホームページで確認:")
            print(f"   http://localhost:8000/")
            print(f"   → {results['articles_generated']}個の新記事が表示されます")
        
        print(f"\n🚀 デプロイ準備完了!")

def main():
    """メイン実行関数"""
    
    parser = argparse.ArgumentParser(description='Mt.MATH 統合記事生成バッチ処理')
    parser.add_argument('--count', type=int, default=3,
                       help='生成する記事数 (デフォルト: 3)')
    parser.add_argument('--categories', nargs='*', 
                       default=['algebra', 'analysis', 'number_theory', 'probability'],
                       choices=list(CATEGORY_MAP.keys()),
                       help='対象カテゴリ')
    parser.add_argument('--dry-run', action='store_true',
                       help='ドライラン（実際の生成は行わない）')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("🧪 ドライランモード: 実際の生成は行いません")
        print(f"📝 予定記事数: {args.count}")
        print(f"📂 対象カテゴリ: {args.categories}")
        print("実際に実行するには --dry-run を外してください")
        return
    
    try:
        batch_generator = BatchGenerator()
        results = batch_generator.run_full_workflow(
            total_articles=args.count,
            target_categories=args.categories
        )
        
        if results["articles_generated"] > 0:
            print(f"\n🎯 次のステップ:")
            print(f"1. ローカルサーバーで記事確認")
            print(f"2. 問題なければVercelにデプロイ")
            print(f"3. 本番環境での動作確認")
        
        # 成功/失敗で終了コード設定
        exit_code = 0 if results["articles_generated"] == args.count else 1
        sys.exit(exit_code)
        
    except Exception as e:
        logger.error(f"バッチ処理実行エラー: {e}")
        print(f"\n❌ バッチ処理に失敗しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()