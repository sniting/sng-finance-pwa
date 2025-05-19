import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-app-compat.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-auth-compat.js';

const firebaseConfig = window.firebaseConfig;
let app, db, auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('Firebase initialized (React module)');
} catch (e) {
  console.error('Firebase init error', e);
}

window.app = app;
window.db = db;
window.auth = auth;

export { app, db, auth };
