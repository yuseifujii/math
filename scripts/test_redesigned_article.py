"""
Mt.MATH - 再設計された記事生成テスト
純粋な数学内容に特化した記事生成を確認
"""

import sys
import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager
from scripts.article_generator_v2 import ArticleGenerator

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_redesigned_article():
    """再設計された記事生成テスト"""
    
    print("🔧 再設計された記事生成テスト")
    print("=" * 50)
    
    # テスト用メタデータ（本来はトピック選定時に生成）
    topic = "二項定理"
    category = "algebra"
    title = "二項定理の完全解説 | 組み合わせから確率まで"
    summary = "二項定理は (x+y)^n の展開公式で、組み合わせ論と深く関連します。パスカルの三角形から確率分布まで、幅広い応用を持つ重要な定理を、高校生にも理解できるよう具体例と証明を交えて解説します。"
    difficulty_level = 4
    niche_score = 6
    tags = ["二項定理", "代数学", "組み合わせ", "高校数学"]
    
    print(f"📄 テストトピック: {topic}")
    print(f"📝 記事タイトル: {title}")
    print(f"📚 カテゴリ: {category}")
    print(f"🎯 対象: 高校2-3年生レベル")
    print(f"📊 想定文字数: 1500文字程度")
    
    try:
        generator = ArticleGenerator()
        
        print(f"\n⏳ 記事生成中...")
        article = generator.generate_article(
            topic=topic,
            category=category,
            title=title,
            summary=summary,
            difficulty_level=difficulty_level,
            niche_score=niche_score,
            tags=tags
        )
        
        print(f"\n✅ 記事生成成功!")
        print(f"📝 タイトル: {article.title}")
        print(f"🔗 スラッグ: {article.slug}")
        print(f"📊 難易度: {article.difficulty_level}/10")
        print(f"🎯 ニッチ度: {article.niche_score}/10")
        
        print(f"\n📖 要約:")
        print(f"  {article.summary}")
        
        print(f"\n🏷️ タグ: {', '.join(article.tags)}")
        
        # 内容の長さチェック
        content_length = len(article.content_html)
        print(f"\n📏 コンテンツ文字数: {content_length}文字")
        
        # 内容プレビュー
        print(f"\n📄 記事内容（プレビュー）:")
        # HTMLタグを除去してプレビュー
        import re
        clean_content = re.sub(r'<[^>]+>', '', article.content_html)
        preview = clean_content[:300] + "..." if len(clean_content) > 300 else clean_content
        print(f"  {preview}")
        
        # 品質チェック
        print(f"\n🔍 品質チェック:")
        
        issues = []
        
        # 文字数チェック
        if content_length < 1000:
            issues.append(f"❌ 文字数不足: {content_length}文字 (1500文字想定)")
        elif content_length >= 1000:
            print(f"✅ 適切な文字数: {content_length}文字")
        
        # 数式チェック
        if '\\(' in article.content_html or '\\[' in article.content_html:
            print("✅ LaTeX数式が含まれています")
        else:
            issues.append("❌ LaTeX数式が含まれていません")
        
        # HTMLクラスチェック  
        if any(cls in article.content_html for cls in ['definition-box', 'theorem-box', 'proof-section', 'example-box']):
            print("✅ 適切なCSSクラスが使用されています")
        else:
            issues.append("❌ CSSクラスが使用されていません")
        
        # 実際の数学内容チェック
        if any(word in clean_content for word in ['定義', '証明', '例', '計算', '公式']):
            print("✅ 実際の数学的内容が含まれています")
        else:
            issues.append("❌ 数学的内容が薄い可能性があります")
        
        # テンプレート的内容のチェック
        if any(phrase in clean_content for phrase in ['とは...', '〜などがある', '基本的な考え方から']):
            issues.append("❌ テンプレート的な表現が残っています")
        else:
            print("✅ 具体的な内容で構成されています")
        
        if issues:
            print(f"\n⚠️ 発見された問題:")
            for issue in issues:
                print(f"  {issue}")
        else:
            print(f"\n🎉 品質チェック完全クリア！")
        
        # 保存オプション
        save_choice = input(f"\n💾 この記事をFirestoreに保存しますか？ (y/N): ").lower()
        if save_choice == 'y':
            article.status = "draft"
            slug = firestore_manager.save_article(article, allow_overwrite=True)
            print(f"✅ 記事を保存しました (slug: {slug})")
        
        return len(issues) == 0
        
    except Exception as e:
        print(f"❌ 記事生成エラー: {e}")
        return False

def main():
    """テスト実行"""
    
    if test_redesigned_article():
        print(f"\n🎉 再設計された記事生成テスト成功！")
        print(f"✅ 純粋な数学内容に特化した記事生成が機能しています")
        print(f"🚀 本格運用の準備が整いました")
    else:
        print(f"\n⚠️ まだ改善が必要です")
        print(f"🔧 プロンプトの追加調整を検討してください")

if __name__ == "__main__":
    main()