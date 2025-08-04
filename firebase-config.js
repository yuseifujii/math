// Firebase 設定
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定オブジェクト  
const firebaseConfig = {
    apiKey: "AIzaSyDVJE5keiOOD73rdA07atxomRxmTVMQApE",
    authDomain: "math-52da7.firebaseapp.com",
    projectId: "math-52da7", 
    storageBucket: "math-52da7.firebasestorage.app",
    messagingSenderId: "755846899439",
    appId: "1:755846899439:web:57e59294d641caa6cc1d1a"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// エクスポート
window.firebase = { db, collection, getDocs, doc, getDoc, query, where, orderBy, limit };

console.log('✅ Firebase 初期化完了');