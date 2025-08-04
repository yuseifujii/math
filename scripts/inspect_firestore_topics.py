#!/usr/bin/env python3
"""
Firestoreのトピックデータを詳細調査
"""

import logging
from scripts.config import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def inspect_firestore_topics():
    """Firestoreのトピックデータを詳細確認"""
    
    print("🔍 Firestoreトピックデータ詳細調査")
    print("=" * 60)
    
    try:
        topics_ref = config.db.collection(config.math_topics_collection)
        topics = topics_ref.stream()
        
        problem_found = False
        
        for doc in topics:
            data = doc.to_dict()
            doc_id = doc.id
            
            print(f"\n📄 ドキュメントID: {doc_id}")
            print(f"🏷️  トピック名(name): {data.get('name', 'NOT FOUND')}")
            print(f"📝 タイトル(title): {data.get('title', 'NOT FOUND')}")
            print(f"📚 カテゴリ: {data.get('category', 'NOT FOUND')}")
            print(f"✅ 生成済み: {data.get('article_generated', 'NOT FOUND')}")
            
            # 問題チェック: nameがランダム文字列かどうか
            name = data.get('name', '')
            if len(name) > 15 and name.replace('-', '').replace('_', '').isalnum():
                # ランダム文字列の可能性
                if any(c.isupper() and c.islower() for c in name):
                    print(f"🚨 **PROBLEM DETECTED**: nameフィールドがランダム文字列の可能性")
                    print(f"   問題のname: {name}")
                    problem_found = True
            
            # 全フィールド表示
            print(f"📋 全データ:")
            for key, value in data.items():
                print(f"   {key}: {value}")
                
        if not problem_found:
            print(f"\n✅ トピックデータに明らかな問題は見つかりませんでした")
        else:
            print(f"\n🚨 問題のあるトピックデータが発見されました！")
            
    except Exception as e:
        print(f"❌ 調査エラー: {e}")

def main():
    inspect_firestore_topics()

if __name__ == "__main__":
    main()