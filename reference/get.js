const { getFirestore } = require('../lib/firebase');

/**
 * ランキング取得API
 * GET /api/rankings/get
 */
module.exports = async (req, res) => {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = getFirestore();
    
    // 全体の参加者数を取得
    const totalSnapshot = await db.collection('rankings').get();
    const totalParticipants = totalSnapshot.size;
    
    // ランキングコレクションから上位10件を取得
    const snapshot = await db.collection('rankings')
      .orderBy('score', 'desc')
      .orderBy('timestamp', 'asc') // 同スコアの場合は早い者勝ち
      .limit(10)
      .get();

    const rankings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // タイムスタンプがnullの場合のハンドリング
      let timestamp;
      try {
        timestamp = data.timestamp && data.timestamp.toDate ? 
          data.timestamp.toDate().toISOString() : 
          new Date().toISOString();
      } catch (timestampError) {
        console.warn('⚠️ タイムスタンプエラー:', timestampError);
        timestamp = new Date().toISOString();
      }
      
      rankings.push({
        id: doc.id,
        score: data.score,
        nickname: data.nickname,
        affiliation: data.affiliation,
        timestamp: timestamp
      });
    });

    res.status(200).json({
      success: true,
      rankings: rankings,
      count: rankings.length,
      totalParticipants: totalParticipants,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ランキング取得エラー:', error);
    console.error('エラー詳細:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'ランキングの取得に失敗しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};