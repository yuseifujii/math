"""
Mt.MATH - 改善された記事生成テスト
修正されたプロンプトで記事品質を確認
"""

import sys
import logging
from scripts.config import config
from scripts.firestore_manager import firestore_manager
from scripts.article_generator_v2 import ArticleGenerator

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_improved_article():
    """改善されたプロンプトで記事生成テスト"""
    
    print("🧪 改善された記事生成テスト")
    print("=" * 50)
    
    # テスト用のシンプルなトピック
    test_topic = "二項定理"
    category = "algebra"
    
    print(f"📄 テストトピック: {test_topic}")
    print(f"📚 カテゴリ: {category}")
    print(f"🎯 目標: 高校生レベルで理解できる記事生成")
    
    try:
        generator = ArticleGenerator()
        
        # 適切な難易度設定で記事生成
        article = generator.generate_article(
            topic=test_topic,
            category=category,
            difficulty_level=4,  # 高校生レベル
            niche_score=6        # 適度にニッチ
        )
        
        print(f"\n✅ 記事生成成功!")
        print(f"📝 タイトル: {article.title}")
        print(f"🔗 スラッグ: {article.slug}")
        print(f"📊 難易度: {article.difficulty_level}/10")
        print(f"🎯 ニッチ度: {article.niche_score}/10")
        
        print(f"\n📖 要約:")
        print(f"  {article.summary}")
        
        print(f"\n🧮 数学的定義:")
        print(f"  {article.mathematical_statement[:100]}...")
        
        print(f"\n📄 記事内容（先頭）:")
        content_preview = article.content_html.replace('<', '\n<')[:300]
        print(f"  {content_preview}...")
        
        print(f"\n🔍 証明内容（先頭）:")
        proof_preview = article.proof_html.replace('<', '\n<')[:200]
        print(f"  {proof_preview}...")
        
        print(f"\n💡 例題内容（先頭）:")
        examples_preview = article.examples_html.replace('<', '\n<')[:200] if article.examples_html else "未生成"
        print(f"  {examples_preview}...")
        
        print(f"\n🏷️ タグ: {', '.join(article.tags)}")
        
        # 品質チェック
        print(f"\n🔍 品質チェック:")
        
        issues = []
        
        # 応答文チェック
        if any(phrase in article.content_html.lower() for phrase in ['はい', '承知', 'いたしました']):
            issues.append("❌ 応答文が含まれています")
        else:
            print("✅ 応答文なし")
        
        # 証明チェック
        if "証明が生成されませんでした" in article.proof_html:
            issues.append("❌ 証明が生成されていません")
        else:
            print("✅ 証明が生成されています")
        
        # 内容の長さチェック
        if len(article.content_html) < 300:
            issues.append("❌ 記事内容が短すぎます")
        else:
            print("✅ 記事内容の長さ適切")
        
        # HTML構造チェック
        if 'class=' in article.content_html:
            print("✅ CSSクラスが使用されています")
        else:
            issues.append("❌ CSSクラスが使用されていません")
        
        # LaTeX数式チェック
        if '\\[' in article.content_html or '\\(' in article.content_html:
            print("✅ LaTeX数式が含まれています")
        else:
            issues.append("❌ LaTeX数式が含まれていません")
        
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
    
    if test_improved_article():
        print(f"\n🎉 改善された記事生成テスト成功！")
        print(f"✅ プロンプト修正が効果的でした")
    else:
        print(f"\n⚠️ まだ改善が必要です")
        print(f"🔧 プロンプトの追加修正を検討してください")

if __name__ == "__main__":
    main()