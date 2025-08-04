#!/usr/bin/env python3
"""
記事内容デバッグスクリプト
- Firestoreの記事を詳細確認
- 問題のある記事を特定
"""

import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def debug_article_content():
    """Firestore上の記事内容を詳細確認"""
    
    print("🔍 記事内容デバッグ調査")
    print("=" * 50)
    
    try:
        articles_ref = config.db.collection(config.articles_collection)
        articles = articles_ref.stream()
        
        problem_articles = []
        
        for doc in articles:
            data = doc.to_dict()
            title = data.get('title', 'No Title')
            slug = data.get('slug', 'No Slug')
            content = data.get('content_html', '')
            
            print(f"\n📄 記事: {title}")
            print(f"🔗 スラッグ: {slug}")
            print(f"📏 内容文字数: {len(content)}")
            
            # 問題のある文字列をチェック
            suspicious_patterns = [
                'WRvXPrFEHSdZRknAr5xH',
                r'[A-Za-z]{15,}',  # 長い意味不明なアルファベット文字列
                r'[A-Z]{5,}[a-z]{5,}[A-Z]{5,}',  # 大文字小文字が混在する長い文字列
            ]
            
            import re
            for pattern in suspicious_patterns:
                matches = re.findall(pattern, content)
                if matches:
                    print(f"⚠️  疑わしいパターン '{pattern}' 発見: {matches}")
                    problem_articles.append({
                        'title': title,
                        'slug': slug,
                        'doc_id': doc.id,
                        'suspicious_content': matches
                    })
            
            # 内容の先頭100文字を表示
            content_preview = content[:200] if content else "内容なし"
            print(f"📖 内容プレビュー:")
            print(f"   {content_preview}...")
            
            # HTMLタグの除去して実際のテキストを確認
            import re
            text_only = re.sub(r'<[^>]+>', '', content)
            if 'WRvXPrFEHSdZRknAr5xH' in text_only or any(len(word) > 15 and word.isalpha() for word in text_only.split()):
                print(f"🚨 問題のある記事を発見: {title}")
                
        print(f"\n📊 問題記事統計:")
        print(f"問題記事数: {len(problem_articles)}")
        
        if problem_articles:
            print(f"\n🚨 問題記事詳細:")
            for article in problem_articles:
                print(f"  • {article['title']}")
                print(f"    スラッグ: {article['slug']}")
                print(f"    ドキュメントID: {article['doc_id']}")
                print(f"    疑わしい内容: {article['suspicious_content']}")
                
        return problem_articles
        
    except Exception as e:
        print(f"❌ 記事確認エラー: {e}")
        return []

def main():
    return debug_article_content()

if __name__ == "__main__":
    main()