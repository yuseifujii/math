"""
Mt.MATH - 高品質記事自動生成スクリプト
与えられた数学的概念について詳細で美しい記事を生成する
"""

import sys
import argparse
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from scripts.config import config
from scripts.data_models import MathArticle, CATEGORY_MAP
from scripts.firestore_manager import firestore_manager

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ArticleGenerator:
    """高品質記事生成クラス"""
    
    def __init__(self):
        self.model = config.gemini_model
        if not self.model:
            raise ValueError("Gemini モデルが初期化されていません")
    
    def generate_article(self, topic: str, category: str, title: str, summary: str,
                        difficulty_level: int = 5, niche_score: int = 7, tags: List[str] = None) -> MathArticle:
        """数学トピックから高品質記事を生成"""
        
        logger.info(f"記事生成開始: {topic} (カテゴリ: {category})")
        
        # プロンプト構築
        prompt = self._build_generation_prompt(topic, category, difficulty_level, niche_score)
        
        try:
            # Gemini APIで記事生成（HTMLコンテンツのみ）
            response = self.model.generate_content(prompt)
            content_html = response.text.strip()
            
            # 記事オブジェクト作成（メタデータは外部から受け取り）
            article = MathArticle(
                title=title,
                slug=MathArticle.generate_slug(title),
                category=category,
                content_html=content_html,
                summary=summary,
                difficulty_level=difficulty_level,
                niche_score=niche_score,
                tags=tags or [topic, CATEGORY_MAP.get(category, category)],
                meta_description=summary[:160]
            )
            
            logger.info(f"記事生成完了: {article.title}")
            return article
            
        except Exception as e:
            logger.error(f"記事生成エラー: {e}")
            raise
    
    def _build_generation_prompt(self, topic: str, category: str, 
                                difficulty_level: int, niche_score: int) -> str:
        """純粋な数学記事内容生成用プロンプト"""
        
        category_jp = CATEGORY_MAP.get(category, "その他")
        
        # 難易度に応じた説明レベル
        level_desc = {
            1: "中学生", 2: "中学生", 3: "高校1年生", 4: "高校2-3年生", 
            5: "高校3年生〜大学1年生", 6: "大学1-2年生", 7: "大学2-3年生",
            8: "大学3-4年生", 9: "大学院生", 10: "研究者"
        }.get(difficulty_level, "高校生")
        
        prompt = f"""{topic}について{level_desc}レベル向けの約1500文字のHTML記事を作成してください。

## 厳格な書式要件

### 【HTML構造ルール】
- **見出し**: h2(メイン) → h3(サブ) → h4(詳細)のみ使用
- **段落**: 1段落50-100文字、2-3文で改行
- **改行**: <br/>は使用禁止、<p>タグで段落分け

### 【数式書式ルール】 
- **インライン数式**: 短い式のみ \\( x^2 \\)
- **ブロック数式**: 重要な式は必ず \\[ x^2 + y^2 = z^2 \\]
- **数式番号**: 不要、LaTeXコマンドのみ使用

### 【強調表現ルール（シンプル・統一）】
- **重要語句・定義語**: <strong>重要語句</strong>
- **特に重要な定義**: <strong style="color: #1976d2;">定義語</strong>
- **注意点**: <em>注意</em>

### 【CSSクラス使用ルール】
<div class="definition-box">
  <h3>定義</h3>
  <p><strong>{topic}</strong>とは...</p>
  <div class="mathematical-statement">\\[ 数式 \\]</div>
</div>

### 【証明書式ルール（最優先）】
証明可能なトピックでは**必ず完全な証明**を含める：
<div class="proof-section">
  <h3>証明</h3>
  <div class="step-by-step">
    <p><strong>Step 1:</strong> 仮定の整理</p>
    <p>具体的な仮定内容...</p>
    <p><strong>Step 2:</strong> 変形・導出</p>
    <p>\\[ 数式変形 \\]</p>
    <p><strong>Step 3:</strong> 結論</p>
    <p>∴ 結論文 <strong>■</strong></p>
  </div>
</div>

### 【例題書式ルール】
例題を含める場合：
<div class="example-box">
  <h3>例題</h3>
  <p><strong>【例題1】</strong></p>
  <p>問題文...</p>
  <p><strong>【解】</strong></p>
  <p>\\[ 計算過程 \\]</p>
  <p><strong>答え: ...</strong></p>
</div>

### 【論理記号統一ルール】
- 従って: ∴ 
- なぜなら: ∵
- ならば: ⇒ 
- 同値: ⇔
- 証明終了: ■

## 内容要件
1. **証明最優先**: 証明可能なら必ず完全な証明を含める
2. **実際の数学内容**: 抽象的説明ではなく具体的な定義・公式・計算
3. **段階的構成**: 定義 → 性質 → 証明 → 例題 → 応用の流れ

## 禁止事項
- 図解への言及
- 「〜については省略」等の省略表現
- 証明の概要のみ（完全な証明を記述）
- 一般的すぎる説明文
- コードブロック記法（```html, ``` 等）は絶対に使用禁止
- DOCTYPE, html, head, body タグは不要

## 出力仕様
- HTMLタグのみを出力（説明文、コードブロック記法一切なし）
- 最初の文字は必ず<で始まる
- 最後の文字は必ず>で終わる

HTMLコンテンツのみ出力："""
        
        return prompt
    


def main():
    """メイン実行関数"""
    
    parser = argparse.ArgumentParser(description='高品質数学記事自動生成ツール')
    parser.add_argument('--topic', required=True, help='数学トピック名')
    parser.add_argument('--category', required=True, 
                       choices=list(CATEGORY_MAP.keys()),
                       help='数学分野')
    parser.add_argument('--title', required=True, help='記事タイトル')
    parser.add_argument('--summary', required=True, help='記事要約')  
    parser.add_argument('--difficulty', type=int, default=5, 
                       help='難易度レベル (1-10)')
    parser.add_argument('--niche', type=int, default=7,
                       help='ニッチ度スコア (1-10)')
    parser.add_argument('--tags', nargs='+', help='タグリスト')
    parser.add_argument('--save', action='store_true',
                       help='Firestoreに保存する')
    parser.add_argument('--publish', action='store_true',
                       help='即座に公開する')
    
    args = parser.parse_args()
    
    try:
        # 記事生成
        generator = ArticleGenerator()
        article = generator.generate_article(
            topic=args.topic,
            category=args.category,
            title=args.title,
            summary=args.summary,
            difficulty_level=args.difficulty,
            niche_score=args.niche,
            tags=args.tags
        )
        
        # ステータス設定
        if args.publish:
            article.status = "published"
        
        # 結果表示
        print(f"\n✅ 記事生成完了!")
        print(f"タイトル: {article.title}")
        print(f"カテゴリ: {article.category}")
        print(f"難易度: {article.difficulty_level}/10")
        print(f"ニッチ度: {article.niche_score}/10")
        print(f"要約: {article.summary}")
        
        # 保存処理
        if args.save:
            slug = firestore_manager.save_article(article)
            print(f"\n💾 Firestoreに保存しました (slug: {slug})")
            
            if args.publish:
                print("🚀 記事が公開されました！")
        else:
            print(f"\n📋 記事内容プレビュー:")
            print(f"スラッグ: {article.slug}")
            print(f"コンテンツ: {article.content_html[:200]}...")
        
    except Exception as e:
        logger.error(f"実行エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()