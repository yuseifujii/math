"""
Mt.MATH - 設定管理モジュール
環境変数と Firebase 接続の設定
"""

import os
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai

# 環境変数をロード
load_dotenv()

class Config:
    """アプリケーション設定クラス"""
    
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.firebase_project_id = os.getenv('FIREBASE_PROJECT_ID', 'math-52da7')
        self.service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', './service-account-key.json')
        self.articles_collection = os.getenv('ARTICLES_COLLECTION', 'articles')
        self.math_topics_collection = os.getenv('MATH_TOPICS_COLLECTION', 'math_topics')
        
        # Firebase初期化
        self._init_firebase()
        
        # Gemini初期化
        self._init_gemini()
    
    def _init_firebase(self):
        """Firebase を初期化"""
        try:
            if not firebase_admin._apps:  # アプリがまだ初期化されていない場合
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred, {
                    'projectId': self.firebase_project_id
                })
            
            self.db = firestore.client()
            print("✅ Firebase 接続成功")
            
        except Exception as e:
            print(f"❌ Firebase 初期化エラー: {e}")
            self.db = None
    
    def _init_gemini(self):
        """Gemini AI を初期化"""
        try:
            if not self.gemini_api_key:
                raise ValueError("GEMINI_API_KEY が設定されていません")
            
            genai.configure(api_key=self.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-2.5-pro')
            print("✅ Gemini AI 接続成功")
            
        except Exception as e:
            print(f"❌ Gemini 初期化エラー: {e}")
            self.gemini_model = None

# グローバル設定インスタンス
config = Config()