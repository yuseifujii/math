#!/usr/bin/env python3
"""
問題のある記事をクリーンアップして再生成
"""

import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager
from scripts.article_generator_v2 import ArticleGenerator
from scripts.data_models import MathTopic

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_and_regenerate_bad_articles():
    """問題記事の削除と再生成"""
    
    print("🧹 問題記事のクリーンアップと再生成")
    print("=" * 60)
    
    # 問題のある記事のスラッグリスト
    bad_article_slugs = [
        "図解ラグランジュの補間多項式とは仕組みと計算例応用まで徹底解説",
        "高校数学からの挑戦ペル方程式入門無限に続く整数解の美しい世界",
        # アイゼンシュタインの記事スラッグも必要であれば追加
    ]
    
    # 対応するトピックのドキュメントID
    topic_ids = [
        "m3BGUywwAB9oHI3ZGGkU",  # ラグランジュの補間多項式
        "WRvXPrFEHSdZRknAr5xH",  # ペル方程式
        # アイゼンシュタインのIDも必要であれば追加
    ]
    
    try:
        # Step 1: 問題記事を削除
        for slug in bad_article_slugs:
            try:
                # 記事を削除
                articles_ref = config.db.collection(config.articles_collection)
                query = articles_ref.where("slug", "==", slug)
                docs = list(query.stream())
                
                for doc in docs:
                    doc.reference.delete()
                    print(f"🗑️  削除完了: {slug}")
                    
            except Exception as e:
                print(f"❌ 記事削除エラー ({slug}): {e}")
        
        # Step 2: 対応するトピックのステータスをリセット
        for topic_id in topic_ids:
            try:
                doc_ref = config.db.collection(config.math_topics_collection).document(topic_id)
                doc_ref.update({
                    "article_generated": False,
                    "article_slug": None
                })
                print(f"🔄 トピックステータスリセット: {topic_id}")
                
            except Exception as e:
                print(f"❌ トピックリセットエラー ({topic_id}): {e}")
        
        # Step 3: リセットしたトピックを再生成
        print(f"\n📖 記事再生成開始...")
        
        generator = ArticleGenerator()
        regenerated_count = 0
        
        for topic_id in topic_ids:
            try:
                # トピック情報を取得
                doc_ref = config.db.collection(config.math_topics_collection).document(topic_id)
                doc = doc_ref.get()
                
                if doc.exists:
                    data = doc.to_dict()
                    data['topic_id'] = doc.id
                    topic = MathTopic(**data)
                    
                    print(f"\n📝 再生成中: {topic.name}")
                    print(f"   タイトル: {topic.title}")
                    
                    # 記事生成
                    article = generator.generate_article(
                        topic=topic.name,
                        category=topic.category,
                        title=topic.title,
                        summary=topic.summary,
                        difficulty_level=topic.difficulty_level,
                        niche_score=topic.niche_score,
                        tags=topic.tags
                    )
                    
                    # 自動公開設定
                    article.status = "published"
                    
                    # Firestoreに保存
                    firestore_manager.save_article(article, allow_overwrite=True)
                    
                    # トピックを生成済みとしてマーク
                    firestore_manager.update_topic_status(
                        topic_id,
                        generated=True,
                        article_slug=article.slug
                    )
                    
                    print(f"✅ 再生成完了: {article.title}")
                    print(f"   スラッグ: {article.slug}")
                    print(f"   文字数: {len(article.content_html)}文字")
                    
                    regenerated_count += 1
                    
                else:
                    print(f"⚠️  トピックが見つかりません: {topic_id}")
                    
            except Exception as e:
                print(f"❌ 記事再生成エラー ({topic_id}): {e}")
                
        print(f"\n🎉 クリーンアップ完了!")
        print(f"📊 削除記事数: {len(bad_article_slugs)}")
        print(f"📊 再生成記事数: {regenerated_count}")
        
        if regenerated_count > 0:
            print(f"\n🌐 再生成記事確認URL:")
            print(f"   http://localhost:8000/")
            
    except Exception as e:
        print(f"❌ クリーンアップエラー: {e}")
        import traceback
        traceback.print_exc()

def main():
    clean_and_regenerate_bad_articles()

if __name__ == "__main__":
    main()