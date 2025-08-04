#!/usr/bin/env python3
"""
デプロイメント状況確認スクリプト
- 記事の生成状況
- トピックの状況
- Firebase接続確認
"""

import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_deployment_status():
    """デプロイメント準備状況をチェック"""
    
    print("🔍 Mt.MATH デプロイメント状況確認")
    print("=" * 50)
    
    # Firebase接続確認
    if not config.db:
        print("❌ Firebase接続失敗")
        return False
    else:
        print("✅ Firebase接続成功")
    
    # 記事状況確認
    try:
        articles_ref = config.db.collection(config.articles_collection)
        articles = articles_ref.stream()
        article_count = 0
        published_count = 0
        
        print("\n📚 記事一覧:")
        for doc in articles:
            data = doc.to_dict()
            article_count += 1
            status = data.get('status', 'unknown')
            if status == 'published':
                published_count += 1
            print(f"  • {data.get('title', 'No Title')} (Status: {status})")
            print(f"    Slug: {data.get('slug', 'No Slug')}")
        
        print(f"\n📊 記事統計:")
        print(f"  総記事数: {article_count}")
        print(f"  公開済み記事: {published_count}")
        
    except Exception as e:
        print(f"❌ 記事取得エラー: {e}")
        return False
    
    # トピック状況確認
    try:
        topics_ref = config.db.collection(config.math_topics_collection)
        topics = topics_ref.stream()
        topic_count = 0
        generated_count = 0
        
        print(f"\n🎯 トピック一覧:")
        for doc in topics:
            data = doc.to_dict()
            topic_count += 1
            generated = data.get('article_generated', False)
            if generated:
                generated_count += 1
            print(f"  • {data.get('name', 'No Name')} (Generated: {generated})")
            if not generated:
                print(f"    ⚠️  未生成トピック: {data.get('title', 'No Title')}")
                print(f"    📝 要修正: article_generated を true に変更してください")
        
        print(f"\n📊 トピック統計:")
        print(f"  総トピック数: {topic_count}")
        print(f"  記事生成済み: {generated_count}")
        print(f"  未生成: {topic_count - generated_count}")
        
    except Exception as e:
        print(f"❌ トピック取得エラー: {e}")
        return False
    
    # デプロイ準備チェック
    print(f"\n🚀 デプロイ準備状況:")
    if published_count == 0:
        print("⚠️  公開済み記事がありません")
        print("📝 対応必要事項:")
        print("   1. Firestoreセキュリティルールを設定")
        print("   2. 未生成トピックのarticle_generatedをtrueに変更")
        print("   3. 記事のstatusをpublishedに変更")
        return False
    else:
        print(f"✅ {published_count}記事が公開準備完了")
        return True

def main():
    return check_deployment_status()

if __name__ == "__main__":
    main()