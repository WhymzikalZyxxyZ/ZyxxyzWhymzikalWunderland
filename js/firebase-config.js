// ═══════════════════════════════════════════════════════════════════
//  FIREBASE CONFIG — fill this in once and all pages share it.
//
//  Steps:
//  1. Go to https://console.firebase.google.com
//  2. Create a project, then Add a Web App — copy the config object.
//  3. Under Build › Realtime Database, create a database (test mode).
//  4. Replace every "YOUR_..." value below with your real values.
//  5. Set Realtime Database rules to:
//       { "rules": { ".read": true, ".write": true } }
// ═══════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBolSqtz8_CTVVLjRGFZaIQ_7u4sIWAuZY",
    authDomain: "wunderland-cd935.firebaseapp.com",
    databaseURL: "https://wunderland-cd935-default-rtdb.firebaseio.com",
    projectId: "wunderland-cd935",
    storageBucket: "wunderland-cd935.firebasestorage.app",
    messagingSenderId: "96451930583",
    appId: "1:96451930583:web:37350a5d4bf76cd6bd8392",
    measurementId: "G-KNX537QQ8G"
};

const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

if (FIREBASE_READY && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
