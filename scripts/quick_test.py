"""
Mt.MATH - クイックテストスクリプト
段階的な動作確認用（少量のデータでテスト）
"""

import sys
import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager
from scripts.topic_selector import TopicSelector
from scripts.article_generator_v2 import ArticleGenerator

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_basic_connections():
    """基本接続テスト"""
    print("🧪 基本接続テスト...")
    
    # Firebase
    if config.db is None:
        print("❌ Firebase接続失敗")
        return False
    print("✅ Firebase接続成功")
    
    # Gemini
    if config.gemini_model is None:
        print("❌ Gemini API接続失敗")
        return False
    print("✅ Gemini API接続成功")
    
    return True

def test_topic_selection():
    """テーマ選定テスト（3個のみ）"""
    print("\n📋 テーマ選定テスト（3個のニッチテーマを生成）...")
    
    try:
        selector = TopicSelector()
        topics = selector.generate_niche_topics(count=3, target_categories=["algebra"])
        
        print(f"✅ {len(topics)}個のテーマを生成しました:")
        for i, topic in enumerate(topics, 1):
            print(f"  {i}. {topic.name} (ニッチ度: {topic.niche_score}/10)")
        
        # Firestoreに保存
        saved_count = 0
        for topic in topics:
            try:
                firestore_manager.save_topic(topic)
                saved_count += 1
            except Exception as e:
                print(f"⚠️ トピック保存エラー: {e}")
        
        print(f"💾 {saved_count}個のテーマをFirestoreに保存しました")
        return topics
        
    except Exception as e:
        print(f"❌ テーマ選定エラー: {e}")
        return []

def test_article_generation(topic_name: str = None):
    """記事生成テスト（1記事のみ）"""
    if not topic_name:
        topic_name = "ピックの定理"  # デフォルトのテストトピック
    
    print(f"\n📄 記事生成テスト: {topic_name}")
    
    try:
        # 重複チェック
        if firestore_manager.check_topic_exists(topic_name, "algebra"):
            print(f"⚠️ '{topic_name}' は既に記事化されています")
            return False
        
        generator = ArticleGenerator()
        article = generator.generate_article(
            topic=topic_name,
            category="algebra",
            difficulty_level=4,  # テスト用に低めに設定
            niche_score=8
        )
        
        print(f"✅ 記事生成成功:")
        print(f"  タイトル: {article.title}")
        print(f"  スラッグ: {article.slug}")
        print(f"  要約: {article.summary[:100]}...")
        
        # Firestoreに保存（テスト用）
        article.status = "draft"  # 最初はドラフトで保存
        slug = firestore_manager.save_article(article)
        print(f"💾 記事を下書きとして保存しました (slug: {slug})")
        
        return True
        
    except Exception as e:
        print(f"❌ 記事生成エラー: {e}")
        return False

def main():
    """クイックテスト実行"""
    print("🚀 Mt.MATH クイックテスト開始\n")
    print("=" * 50)
    
    # Step 1: 基本接続確認
    if not test_basic_connections():
        print("\n❌ 基本接続に失敗しました。設定を確認してください。")
        sys.exit(1)
    
    # Step 2: テーマ選定テスト
    topics = test_topic_selection()
    if not topics:
        print("\n❌ テーマ選定に失敗しました。")
        sys.exit(1)
    
    # Step 3: 記事生成テスト
    # 生成されたテーマの1つ目を使用
    test_topic = topics[0].name if topics else "アイゼンシュタインの判定法"
    
    if not test_article_generation(test_topic):
        print(f"\n❌ 記事生成に失敗しました。")
        sys.exit(1)
    
    # 成功メッセージ
    print("\n" + "=" * 50)
    print("🎉 クイックテスト完了！")
    print("\n📊 実行結果:")
    print("✅ Firebase接続: 成功")
    print("✅ Gemini API接続: 成功") 
    print(f"✅ テーマ選定: {len(topics)}個のテーマを生成")
    print("✅ 記事生成: 1記事を下書き保存")
    
    print("\n🔍 次の確認事項:")
    print("1. Firebaseコンソールで記事データが保存されているか確認")
    print("2. 生成された記事の品質を確認")
    print("3. 問題なければ本格運用開始")
    
    print("\n🚀 本格運用コマンド例:")
    print("python scripts/topic_selector.py --count 10 --save")
    print("python scripts/article_generator_v2.py --topic '生成されたテーマ名' --category geometry --save --publish")

if __name__ == "__main__":
    main()