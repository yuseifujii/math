"""
Mt.MATH - システムテストスクリプト
Firestore接続とGemini APIの動作確認
"""

import sys
import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager
from scripts.data_models import MathTopic, MathArticle

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_firebase_connection():
    """Firebase接続テスト"""
    print("🔥 Firebase接続テスト...")
    
    try:
        if config.db is None:
            print("❌ Firebase接続に失敗しました")
            return False
        
        # テストデータの作成
        test_topic = MathTopic(
            name="テスト定理",
            category="test",
            description="テスト用の数学概念です",
            difficulty_level=5,
            niche_score=8,
            keywords=["テスト", "数学"]
        )
        
        # 保存テスト
        topic_id = firestore_manager.save_topic(test_topic)
        print(f"✅ トピック保存成功 (ID: {topic_id})")
        
        # 統計情報取得テスト
        stats = firestore_manager.get_stats()
        print(f"✅ 統計情報取得成功: {stats}")
        
        return True
        
    except Exception as e:
        print(f"❌ Firebase接続エラー: {e}")
        return False

def test_gemini_connection():
    """Gemini API接続テスト"""
    print("\n🤖 Gemini API接続テスト...")
    
    try:
        if config.gemini_model is None:
            print("❌ Gemini API接続に失敗しました")
            return False
        
        # 簡単なテストプロンプト
        test_prompt = """
        以下の内容を要約してください：
        
        ピタゴラスの定理は、直角三角形において、直角を挟む二辺の平方の和が斜辺の平方に等しいという定理です。
        """
        
        response = config.gemini_model.generate_content(test_prompt)
        print(f"✅ Gemini API接続成功")
        print(f"📝 レスポンス例: {response.text[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Gemini API接続エラー: {e}")
        return False

def test_topic_generation():
    """トピック生成テスト"""
    print("\n📋 トピック生成テスト...")
    
    try:
        from scripts.topic_selector import TopicSelector
        
        selector = TopicSelector()
        topics = selector.generate_niche_topics(count=2, target_categories=["geometry"])
        
        if len(topics) > 0:
            print(f"✅ トピック生成成功: {len(topics)}個のトピックを生成")
            for i, topic in enumerate(topics, 1):
                print(f"  {i}. {topic.name} (ニッチ度: {topic.niche_score}/10)")
            return True
        else:
            print("❌ トピック生成に失敗しました")
            return False
            
    except Exception as e:
        print(f"❌ トピック生成エラー: {e}")
        return False

def test_article_generation():
    """記事生成テスト"""
    print("\n📄 記事生成テスト...")
    
    try:
        from scripts.article_generator_v2 import ArticleGenerator
        
        generator = ArticleGenerator()
        article = generator.generate_article(
            topic="テスト定理",
            category="geometry",
            difficulty_level=3,
            niche_score=7
        )
        
        print(f"✅ 記事生成成功")
        print(f"  タイトル: {article.title}")
        print(f"  カテゴリ: {article.category}")
        print(f"  要約: {article.summary[:50]}...")
        print(f"  スラッグ: {article.slug}")
        
        return True
        
    except Exception as e:
        print(f"❌ 記事生成エラー: {e}")
        return False

def main():
    """全テスト実行"""
    print("🧪 Mt.MATH システムテストを開始します...\n")
    
    tests = [
        ("Firebase接続", test_firebase_connection),
        ("Gemini API接続", test_gemini_connection),
        ("トピック生成", test_topic_generation),
        ("記事生成", test_article_generation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}でエラーが発生: {e}")
            results.append((test_name, False))
    
    # 結果サマリー
    print("\n" + "="*50)
    print("🧪 テスト結果サマリー")
    print("="*50)
    
    passed = 0
    total = len(results)
    
    for test_name, passed_test in results:
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{status} {test_name}")
        if passed_test:
            passed += 1
    
    print(f"\n📊 結果: {passed}/{total} テストが成功しました")
    
    if passed == total:
        print("🎉 全てのテストが成功しました！システムは正常に動作しています。")
        
        print("\n🚀 次のステップ:")
        print("1. ニッチトピックを生成: python scripts/topic_selector.py --count 5 --save")
        print("2. 記事を生成: python scripts/article_generator_v2.py --topic 'ピックの定理' --category geometry --save --publish")
        
    else:
        print("⚠️ いくつかのテストが失敗しました。設定を確認してください。")
        sys.exit(1)

if __name__ == "__main__":
    main()