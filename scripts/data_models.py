"""
Mt.MATH - データモデル定義
Firestore用の記事データ構造を定義
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from datetime import datetime
import re

@dataclass
class MathArticle:
    """数学記事のデータモデル（簡素化版）"""
    
    # === 必須フィールド ===
    title: str              # トピック選定時に生成
    slug: str               # URL用スラッグ
    category: str           # 分野
    content_html: str       # メインコンテンツ（AIが自由に構成）
    summary: str            # 要約（トピック選定時に生成）
    difficulty_level: int   # 難易度（トピック選定時に生成）
    niche_score: int        # ニッチ度（トピック選定時に生成）
    tags: List[str]         # タグ（トピック選定時に生成）
    
    # === オプションフィールド ===
    meta_description: str = ""
    related_topics: List[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    author: str = "Mt.MATH AI"
    status: str = "draft"
    view_count: int = 0
    
    def __post_init__(self):
        """初期化後の処理"""
        if self.related_topics is None:
            self.related_topics = []
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
        
        # スラッグの自動生成
        if not self.slug:
            self.slug = self.generate_slug(self.title)
    
    @staticmethod
    def generate_slug(title: str) -> str:
        """タイトルからURLスラッグを生成"""
        # 日本語を削除し、英数字のみに
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def to_dict(self) -> Dict:
        """Firestore保存用の辞書形式に変換"""
        data = asdict(self)
        # datetimeをtimestampに変換
        if self.created_at:
            data['created_at'] = self.created_at
        if self.updated_at:
            data['updated_at'] = self.updated_at
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'MathArticle':
        """Firestoreデータから記事オブジェクトを作成"""
        return cls(**data)

@dataclass  
class MathTopic:
    """数学トピック（記事生成用）のデータモデル - 拡張版"""
    
    # === 基本情報 ===
    name: str                    # トピック名
    category: str                # 分野
    description: str             # 概要説明
    
    # === 記事メタデータ（トピック選定時に生成） ===
    title: str                   # 記事タイトル
    summary: str                 # 記事要約
    difficulty_level: int        # 難易度
    niche_score: int             # ニッチ度
    tags: List[str]              # タグ
    
    # === 生成管理 ===
    article_generated: bool = False
    article_slug: Optional[str] = None
    topic_id: Optional[str] = None  # FirestoreドキュメントID
    priority: int = 5
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Firestore保存用の辞書形式に変換"""
        data = asdict(self)
        if self.created_at:
            data['created_at'] = self.created_at
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'MathTopic':
        """Firestoreデータからトピックオブジェクトを作成"""
        return cls(**data)

# カテゴリマッピング（幾何学除外）
CATEGORY_MAP = {
    "algebra": "代数学", 
    "analysis": "解析学",
    "number_theory": "整数論",
    "probability": "確率論・統計学",
    "combinatorics": "組合せ論",
    "logic": "数理論理学",
    "set_theory": "集合論",
    "calculus": "微積分学",
    "linear_algebra": "線形代数",
    "others": "その他"
}

# 難易度レベルの説明
DIFFICULTY_LEVELS = {
    1: "中学1年生レベル",
    2: "中学2-3年生レベル", 
    3: "高校1年生レベル",
    4: "高校2-3年生レベル",
    5: "大学1年生レベル",
    6: "大学2年生レベル",
    7: "大学3年生レベル",
    8: "大学4年生レベル",
    9: "大学院修士レベル",
    10: "大学院博士・研究レベル"
}