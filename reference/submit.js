const { getFirestore, admin } = require('../lib/firebase');
const { validateScore, validateNickname, validateAffiliation, getRateLimitKey } = require('../lib/validation');

// 簡易レート制限用のメモリキャッシュ（本番環境ではRedisなどを使用推奨）
const rateLimitCache = new Map();

/**
 * スコア送信API
 * POST /api/rankings/submit
 */
module.exports = async (req, res) => {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { score, nickname, affiliation, sessionData } = req.body;

    // 入力値検証
    if (!validateScore(score, sessionData)) {
      res.status(400).json({ 
        success: false, 
        error: 'スコアが無効です' 
      });
      return;
    }

    if (!validateNickname(nickname)) {
      res.status(400).json({ 
        success: false, 
        error: 'ニックネームが無効です' 
      });
      return;
    }

    if (!validateAffiliation(affiliation)) {
      res.status(400).json({ 
        success: false, 
        error: '所属が無効です' 
      });
      return;
    }

    // レート制限チェック（1分間に1回まで）
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const rateLimitKey = getRateLimitKey(clientIP, nickname);
    const now = Date.now();
    const lastSubmission = rateLimitCache.get(rateLimitKey);

    if (lastSubmission && (now - lastSubmission) < 60000) { // 60秒
      res.status(429).json({ 
        success: false, 
        error: 'スコア送信は1分間に1回までです' 
      });
      return;
    }

    // Firestoreにデータを保存
    const db = getFirestore();
    const docRef = await db.collection('rankings').add({
      score: score,
      nickname: nickname.trim(),
      affiliation: affiliation.trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      clientIP: clientIP,
      sessionData: sessionData || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // レート制限キャッシュを更新
    rateLimitCache.set(rateLimitKey, now);

    // 古いキャッシュエントリを定期的にクリア（5分以上古いものを削除）
    for (const [key, timestamp] of rateLimitCache.entries()) {
      if (now - timestamp > 300000) { // 5分
        rateLimitCache.delete(key);
      }
    }

    res.status(201).json({
      success: true,
      message: 'スコアが正常に記録されました',
      id: docRef.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('スコア送信エラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'スコアの記録に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};