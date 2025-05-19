export let app;
export let db;
export let auth;

export function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBiGFtbpGto5ZtyliohDkgUyEawKfQFeOk",
    authDomain: "boston-student-finance.firebaseapp.com",
    projectId: "boston-student-finance",
    storageBucket: "boston-student-finance.appspot.com",
    messagingSenderId: "547176457645",
    appId: "1:547176457645:web:f3dc7064ba8b94ac5d2d24"
  };

  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.app();
  }
  db = firebase.firestore();
  auth = firebase.auth();
}
