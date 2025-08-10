"""
Mt.MATH - ニッチな数学トピック選定スクリプト
SEOで有利なニッチな数学概念を自動選定する
"""

import sys
import argparse
import logging
import random
import json
import os
from typing import List, Dict, Any
from datetime import datetime

from scripts.config import config
from scripts.data_models import MathTopic, CATEGORY_MAP
from scripts.firestore_manager import firestore_manager

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TopicSelector:
    """ニッチ数学トピック選定クラス"""
    
    # カテゴリ別の重み付け（トピックの豊富さに基づく）
    CATEGORY_WEIGHTS = {
        "algebra": 0.40,        # 代数学: 最も豊富（35%）
        "analysis": 0.30,       # 解析学: 豊富（30%）
        "number_theory": 0.20,  # 整数論: 中程度（20%）
        "probability": 0.10,    # 確率論: 限定的（10%）
    }
    
    def __init__(self):
        self.model = config.gemini_model
        if not self.model:
            raise ValueError("Gemini モデルが初期化されていません")
        
        # 既出トピックのロード
        self.generated_topics_file = os.path.join('scripts', 'generated_topics.json')
        self.existing_topics = self._load_existing_topics()
        logger.info(f"既出トピック数: {len(self.existing_topics)}個")
    
    def _load_existing_topics(self) -> List[str]:
        """既出トピックをJSONファイルから読み込む"""
        
        if not os.path.exists(self.generated_topics_file):
            logger.warning("generated_topics.jsonが見つかりません。新規作成します。")
            self._initialize_topics_file()
            return []
        
        try:
            with open(self.generated_topics_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                topics = [topic['name'] for topic in data.get('topics', [])]
                return topics
        except Exception as e:
            logger.error(f"既出トピックの読み込みエラー: {e}")
            return []
    
    def _initialize_topics_file(self):
        """トピックファイルを初期化"""
        
        initial_data = {
            "topics": [],
            "last_updated": datetime.now().isoformat()
        }
        
        try:
            with open(self.generated_topics_file, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f, ensure_ascii=False, indent=2)
            logger.info("generated_topics.jsonを初期化しました")
        except Exception as e:
            logger.error(f"トピックファイルの初期化エラー: {e}")
    
    def _save_new_topic(self, topic: MathTopic):
        """新しいトピックをJSONファイルに追加"""
        
        try:
            # 既存データを読み込む
            with open(self.generated_topics_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 新しいトピックを追加
            new_entry = {
                "name": topic.name,
                "category": topic.category,
                "added_date": datetime.now().strftime('%Y-%m-%d')
            }
            
            # 重複チェック
            if not any(t['name'] == topic.name for t in data['topics']):
                data['topics'].append(new_entry)
                data['last_updated'] = datetime.now().isoformat()
                
                # ファイルに保存
                with open(self.generated_topics_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                # メモリ上のリストも更新
                self.existing_topics.append(topic.name)
                logger.info(f"新規トピックを保存: {topic.name}")
            else:
                logger.warning(f"トピック '{topic.name}' は既に存在します")
                
        except Exception as e:
            logger.error(f"トピック保存エラー: {e}")
    
    def generate_niche_topics(self, count: int = 10, 
                             target_categories: List[str] = None,
                             use_weights: bool = True) -> List[MathTopic]:
        """ニッチな数学トピックを生成
        
        Args:
            count: 生成するトピック数
            target_categories: 対象カテゴリのリスト（Noneの場合は全カテゴリ）
            use_weights: カテゴリの重み付けを使用するかどうか
        """
        
        logger.info(f"ニッチトピック選定開始: {count}個のトピックを生成")
        
        if target_categories is None:
            target_categories = list(CATEGORY_MAP.keys())
        
        topics = []
        
        # カテゴリ別のトピック数を計算
        category_counts = self._calculate_category_counts(count, target_categories, use_weights)
        
        for category, category_count in category_counts.items():
            if category_count == 0:
                continue
                
            logger.info(f"カテゴリ '{category}' で {category_count}個のトピック生成")
            
            category_topics = self._generate_category_topics(category, category_count)
            topics.extend(category_topics)
            
            if len(topics) >= count:
                break
        
        # シャッフルして多様性を確保
        random.shuffle(topics)
        return topics[:count]
    
    def _calculate_category_counts(self, total_count: int, 
                                  categories: List[str], 
                                  use_weights: bool) -> Dict[str, int]:
        """カテゴリ別のトピック数を計算"""
        
        if not use_weights:
            # 均等割り
            base_count = total_count // len(categories)
            remainder = total_count % len(categories)
            counts = {cat: base_count for cat in categories}
            # 余りを最初のカテゴリに追加
            for i, cat in enumerate(categories):
                if i < remainder:
                    counts[cat] += 1
        else:
            # 重み付けに基づく配分
            # 指定されたカテゴリの重みを正規化
            selected_weights = {cat: self.CATEGORY_WEIGHTS.get(cat, 0.25) 
                              for cat in categories}
            total_weight = sum(selected_weights.values())
            
            counts = {}
            allocated = 0
            
            for cat in categories[:-1]:  # 最後のカテゴリ以外
                count = round(total_count * selected_weights[cat] / total_weight)
                counts[cat] = count
                allocated += count
            
            # 最後のカテゴリで調整（端数処理）
            if categories:
                counts[categories[-1]] = total_count - allocated
        
        # 最低1個は生成するように調整（小さい数の場合）
        if total_count >= len(categories):
            for cat in categories:
                if counts[cat] == 0:
                    counts[cat] = 1
        
        logger.info(f"カテゴリ別配分: {counts}")
        return counts
    
    def _generate_category_topics(self, category: str, count: int) -> List[MathTopic]:
        """特定カテゴリのニッチトピックを生成"""
        
        prompt = self._build_topic_selection_prompt(category, count)
        
        try:
            response = self.model.generate_content(prompt)
            content = response.text
            
            topics = self._parse_topics_response(content, category)
            
            logger.info(f"カテゴリ '{category}' で {len(topics)}個のトピックを生成")
            return topics
            
        except Exception as e:
            logger.error(f"トピック生成エラー (カテゴリ: {category}): {e}")
            return []
    
    def _build_topic_selection_prompt(self, category: str, count: int) -> str:
        """トピック選定用プロンプトを構築"""
        
        category_jp = CATEGORY_MAP.get(category, category)
        
        # 既出トピックリストを作成
        existing_topics_text = ""
        if self.existing_topics:
            existing_topics_text = f"""
## ⚠️ 重要: 既出トピック（以下のトピックは選定しないでください）

以下のトピックはすでに記事化されているため、**絶対に選定しないでください**：

{chr(10).join(f"- {topic}" for topic in self.existing_topics)}

上記のトピックと同じ名前のものや、実質的に同じ内容のものは避けてください。
"""
        
        prompt = f"""
# ニッチな数学トピック選定

## 目標
{category_jp}分野で、以下の条件を満たすニッチな数学トピックを{count}個選定してください。
{existing_topics_text}

## 選定基準

### 1. ニッチ度重視 (スコア: 7-10)
- 一般的すぎない（「三平方の定理」「二次方程式」などは避ける）
- 専門的すぎない（大学院レベルは避ける）  
- 高校〜大学学部レベルが理想
- 検索競合が少なそうなトピック

### 2. 適切な難易度（重要！）
- **高校生でも頑張れば理解できるレベル**
- 大学1-2年生程度の内容が理想
- 専門的すぎず、基礎的すぎない

### 3. SEO価値が高い
- 検索される可能性がある
- 学習者が「知りたい」と思うトピック
- 教育的価値が高い

### 4. 記事化しやすい
- 定理や概念が明確
- 証明や例題が豊富
- 数式中心で説明可能

## カテゴリ別のニッチトピック例

### 代数学  
- ラグランジュ分解定理、アイゼンシュタインの判定法
- デカルトの符号法則、ニュートンの恒等式
- ヴィエタジャンピング、カルダノの公式

### 解析学
- ダルブーの定理、ロルの定理の一般化
- ウォリスの公式、スターリングの公式
- チェビシェフの不等式、ベルヌーイの不等式

### 整数論
- カーマイケル数、ウィルソンの定理
- ペル方程式、連分数の性質
- クワドラティックフィールド、ガウス整数

### 確率論・統計学
- シンプソンのパラドックス、バートランドの逆説
- ベンフォードの法則、誕生日のパラドックス
- マルコフ不等式、チェルノフ境界

### 組合せ論・グラフ理論
- カタラン数、スターリング数
- ラムゼー理論、ディルワースの定理
- ハミルトンサイクル、オイラーグラフ

## 出力形式
以下のJSON形式で出力してください：

```json
[
    {{
        "name": "トピック名（日本語）",
        "description": "概要説明（100-150文字）",
        "title": "記事タイトル（SEOを意識した魅力的なタイトル）",
        "summary": "記事要約（150-200文字、SEOと読者の興味を引く内容）",
        "difficulty_level": 難易度レベル(3-6),
        "niche_score": ニッチ度(6-9),
        "tags": ["キーワード1", "キーワード2", "キーワード3"],
        "priority": 優先度(1-10)
    }},
    ...
]
```

## 注意事項
- トピック名は検索されやすい日本語で
- 説明は魅力的で学習意欲を刺激する内容に
- タイトル・要約はSEOを意識
- タグはSEOキーワードとして選定
- 優先度は生成の緊急度を示す

{category_jp}分野で、上記の条件を満たすニッチな数学トピックを{count}個選定してください。
"""
        
        return prompt
    
    def _parse_topics_response(self, content: str, category: str) -> List[MathTopic]:
        """レスポンスからトピックリストを解析"""
        
        import json
        import re
        
        topics = []
        
        try:
            # JSONブロックを抽出
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                data = json.loads(json_str)
                
                for item in data:
                    topic_name = item.get('name', '不明なトピック')
                    
                    # 既出トピックのチェック
                    if topic_name in self.existing_topics:
                        logger.warning(f"既出トピック '{topic_name}' をスキップします")
                        continue
                    
                    topic = MathTopic(
                        name=topic_name,
                        category=category,
                        description=item.get('description', ''),
                        title=item.get('title', f"{topic_name}の完全解説"),
                        summary=item.get('summary', f"{topic_name}について解説します。"),
                        difficulty_level=item.get('difficulty_level', 5),
                        niche_score=item.get('niche_score', 7),
                        tags=item.get('tags', [topic_name, CATEGORY_MAP.get(category, category)]),
                        priority=item.get('priority', 5)
                    )
                    topics.append(topic)
            
            else:
                # JSON形式でない場合のフォールバック
                logger.warning("JSON形式のレスポンスが見つかりません。フォールバック処理を実行します。")
                topics = self._create_fallback_topics(content, category)
        
        except Exception as e:
            logger.error(f"トピック解析エラー: {e}")
            topics = self._create_fallback_topics(content, category)
        
        return topics
    
    def _create_fallback_topics(self, content: str, category: str, count: int = 3) -> List[MathTopic]:
        """フォールバック用のトピック生成"""
        
        # カテゴリ別のデフォルトニッチトピック
        default_topics = {
            "algebra": [
                ("アイゼンシュタインの判定法", "多項式の既約性判定法"),
                ("カルダノの公式", "三次方程式の解の公式"),
                ("ニュートンの恒等式", "対称多項式の恒等式")
            ],
            "analysis": [
                ("ダルブーの定理", "連続関数の中間値性質"),
                ("ウォリスの公式", "πの無限積表示"),
                ("スターリングの公式", "階乗の近似公式")
            ],
            "number_theory": [
                ("ウィルソンの定理", "素数の特性定理"),
                ("ペル方程式", "二次ディオファントス方程式"),
                ("カーマイケル数", "合成数の疑似素数")
            ],
            "probability": [
                ("シンプソンのパラドックス", "統計の逆説現象"),
                ("ベンフォードの法則", "自然数の最初の桁の分布"),
                ("誕生日のパラドックス", "確率の直感に反する現象")
            ]
        }
        
        topics = []
        default_list = default_topics.get(category, [("未知のトピック", "説明なし")])
        
        for i, (name, desc) in enumerate(default_list[:count]):
            topic = MathTopic(
                name=name,
                category=category,
                description=desc,
                title=f"{name}の完全解説",
                summary=f"{name}について詳しく解説します。{desc}",
                difficulty_level=5,
                niche_score=8,
                tags=[name, CATEGORY_MAP.get(category, category)],
                priority=5
            )
            topics.append(topic)
        
        return topics

def main():
    """メイン実行関数"""
    
    parser = argparse.ArgumentParser(description='ニッチ数学トピック選定ツール')
    parser.add_argument('--count', type=int, default=10,
                       help='生成するトピック数')
    parser.add_argument('--categories', nargs='+', 
                       choices=list(CATEGORY_MAP.keys()),
                       help='対象カテゴリ（指定しない場合は全カテゴリ）')
    parser.add_argument('--save', action='store_true',
                       help='Firestoreに保存する')
    parser.add_argument('--show-stats', action='store_true',
                       help='統計情報を表示')
    
    args = parser.parse_args()
    
    try:
        selector = TopicSelector()
        
        # トピック生成
        topics = selector.generate_niche_topics(
            count=args.count,
            target_categories=args.categories
        )
        
        # 結果表示
        print(f"\n✅ {len(topics)}個のニッチトピックを選定しました！\n")
        
        for i, topic in enumerate(topics, 1):
            print(f"{i:2d}. {topic.name}")
            print(f"    カテゴリ: {CATEGORY_MAP.get(topic.category, topic.category)}")
            print(f"    難易度: {topic.difficulty_level}/10")
            print(f"    ニッチ度: {topic.niche_score}/10")
            print(f"    優先度: {topic.priority}/10")
            print(f"    説明: {topic.description}")
            print(f"    キーワード: {', '.join(topic.keywords)}")
            print()
        
        # 保存処理
        if args.save:
            saved_count = 0
            for topic in topics:
                try:
                    firestore_manager.save_topic(topic)
                    saved_count += 1
                    # generated_topics.jsonにも保存
                    selector._save_new_topic(topic)
                except Exception as e:
                    logger.error(f"トピック保存エラー ({topic.name}): {e}")
            
            print(f"💾 {saved_count}個のトピックをFirestoreに保存しました！")
        
        # 統計情報表示
        if args.show_stats:
            categories = {}
            total_priority = 0
            total_niche = 0
            
            for topic in topics:
                cat = CATEGORY_MAP.get(topic.category, topic.category)
                categories[cat] = categories.get(cat, 0) + 1
                total_priority += topic.priority
                total_niche += topic.niche_score
            
            print("\n📊 統計情報:")
            print(f"平均優先度: {total_priority/len(topics):.1f}/10")
            print(f"平均ニッチ度: {total_niche/len(topics):.1f}/10")
            print("カテゴリ別分布:")
            for cat, count in categories.items():
                print(f"  {cat}: {count}個")
        
    except Exception as e:
        logger.error(f"実行エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()