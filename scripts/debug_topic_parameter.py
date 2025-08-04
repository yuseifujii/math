#!/usr/bin/env python3
"""
記事生成時のtopicパラメータをデバッグ
"""

import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager
from scripts.data_models import MathTopic

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def debug_topic_parameter():
    """記事生成時のtopicパラメータの内容をデバッグ"""
    
    print("🔍 記事生成時のtopicパラメータ調査")
    print("=" * 60)
    
    try:
        # 未生成トピックを1つ取得
        topics = firestore_manager.get_ungenerated_topics(limit=1)
        
        if not topics:
            # 既存トピックから1つ取得してテスト
            topics_ref = config.db.collection(config.math_topics_collection)
            docs = list(topics_ref.limit(1).stream())
            
            if docs:
                doc = docs[0]
                data = doc.to_dict()
                data['topic_id'] = doc.id
                topic = MathTopic(**data)
                topics = [topic]
            else:
                print("❌ テスト可能なトピックが見つかりません")
                return
        
        topic = topics[0]
        
        print(f"📄 テスト対象トピック:")
        print(f"   ドキュメントID: {topic.topic_id}")
        print(f"   トピック名(name): {topic.name}")
        print(f"   タイトル(title): {topic.title}")
        print(f"   カテゴリ: {topic.category}")
        
        # ArticleGeneratorのgenerate_articleメソッドを確認
        from scripts.article_generator_v2 import ArticleGenerator
        
        print(f"\n🔧 記事生成パラメータ確認:")
        print(f"   topic引数に渡される値: '{topic.name}'")
        print(f"   category引数に渡される値: '{topic.category}'")
        
        # プロンプト生成をテスト（実際のAPI呼び出しなし）
        generator = ArticleGenerator()
        
        # _build_generation_promptメソッドを直接呼び出してプロンプトを確認
        prompt = generator._build_generation_prompt(
            topic=topic.name,
            category=topic.category,
            difficulty_level=topic.difficulty_level,
            niche_score=topic.niche_score
        )
        
        print(f"\n📝 生成されるプロンプト（先頭200文字）:")
        print(f"   {prompt[:200]}...")
        
        # プロンプト内で問題のある文字列が含まれているかチェック
        if topic.topic_id and topic.topic_id in prompt:
            print(f"\n🚨 **重大問題発見**: プロンプト内にドキュメントID '{topic.topic_id}' が含まれています！")
        elif topic.name in prompt:
            print(f"\n✅ 正常: プロンプト内にトピック名 '{topic.name}' が正しく含まれています")
        else:
            print(f"\n⚠️  プロンプト内にトピック名が見つかりません")
            
    except Exception as e:
        print(f"❌ 調査エラー: {e}")
        import traceback
        traceback.print_exc()

def main():
    debug_topic_parameter()

if __name__ == "__main__":
    main()