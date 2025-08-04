# Mt.MATH システム利用ガイド

## 🚀 セットアップ完了！

Firestore連携とGemini APIを使った記事自動生成システムが構築されました。

## 📋 主要機能

### 1. ニッチトピック選定
SEOで有利なニッチな数学概念を自動選定

### 2. 高品質記事生成  
美しいデザインと分かりやすい解説の記事を自動生成

### 3. Firestore連携
記事データを効率的に管理・保存

## 🛠️ 使用方法

### 環境確認
```bash
# システムテスト実行
python scripts/test_system.py
```

### ニッチトピック生成
```bash
# 10個のニッチトピックを生成してFirestoreに保存
python scripts/topic_selector.py --count 10 --save

# 特定カテゴリのみ生成
python scripts/topic_selector.py --count 5 --categories geometry algebra --save

# 統計情報も表示
python scripts/topic_selector.py --count 5 --save --show-stats
```

### 記事生成
```bash
# 記事生成（プレビューのみ）
python scripts/article_generator_v2.py --topic "ピックの定理" --category geometry

# 記事生成してFirestoreに保存
python scripts/article_generator_v2.py --topic "ピックの定理" --category geometry --save

# 記事生成して即座に公開
python scripts/article_generator_v2.py --topic "ピックの定理" --category geometry --save --publish

# 難易度とニッチ度を指定
python scripts/article_generator_v2.py --topic "アイゼンシュタインの判定法" --category algebra --difficulty 6 --niche 9 --save --publish
```

## 📂 プロジェクト構造

```
math/
├── scripts/                    # Python自動化スクリプト
│   ├── config.py              # 環境設定・API初期化
│   ├── data_models.py         # データモデル定義
│   ├── firestore_manager.py   # Firestore操作
│   ├── topic_selector.py      # ニッチトピック選定
│   ├── article_generator_v2.py # 高品質記事生成
│   └── test_system.py         # システムテスト
├── assets/
│   ├── css/
│   │   ├── article.css        # 記事表示用美しいスタイル
│   │   └── games.css          # ゲーム用スタイル
│   └── js/
├── games/                     # 数学ゲーム機能
├── api/                       # 将来のAPI機能
├── .env                       # 環境変数（GEMINI_API_KEY等）
├── service-account-key.json   # Firebase認証キー
└── requirements.txt           # Python依存関係
```

## 🎨 記事デザイン機能

生成される記事には以下の美しいスタイルが適用されます：

- **カラフルなボックス**: 定義、定理、例題用の色分けされたボックス
- **美しい数式**: MathJaxを使った見やすい数式表示
- **段階的証明**: ステップバイステップの分かりやすい証明
- **レスポンシブデザイン**: モバイル対応の美しいレイアウト

## 🎯 おすすめワークフロー

### 1. 週次バッチ作業
```bash
# 1. 新しいニッチトピック選定
python scripts/topic_selector.py --count 20 --save

# 2. Firestoreから未生成トピックを確認
# （管理画面での確認）

# 3. 優先度の高いトピックから記事生成
python scripts/article_generator_v2.py --topic "選定されたトピック名" --category カテゴリ --save --publish
```

### 2. 品質重視の個別作業
```bash
# 特定分野で高品質記事を作成
python scripts/article_generator_v2.py --topic "高度なトピック名" --category analysis --difficulty 8 --niche 9 --save
```

## 🔧 カスタマイズ

### 記事テンプレートの修正
`scripts/article_generator_v2.py` の `_build_generation_prompt()` メソッドでプロンプトを調整

### スタイルの変更
`assets/css/article.css` で記事の見た目をカスタマイズ

### データモデルの拡張
`scripts/data_models.py` で記事やトピックの構造を変更

## 📊 データ管理

### Firestoreコレクション
- `articles`: 生成された記事データ
- `math_topics`: 記事生成用トピックデータ

### 記事ステータス
- `draft`: 下書き
- `published`: 公開中
- `archived`: アーカイブ済み

## 🚨 注意事項

1. **APIキー管理**: `.env`ファイルの`GEMINI_API_KEY`が正しく設定されているか確認
2. **Firebase認証**: `service-account-key.json`が正しく配置されているか確認
3. **依存関係**: `pip install -r requirements.txt`で必要なライブラリをインストール

## 🎉 次の段階

このシステムが正常に動作したら、以下の機能拡張を検討：

1. **Web管理画面**: 記事管理用のWebインターフェース
2. **自動公開スケジューラー**: 定期的な記事生成・公開
3. **SEO最適化**: メタデータの自動生成・最適化
4. **アナリティクス連携**: 記事パフォーマンスの追跡