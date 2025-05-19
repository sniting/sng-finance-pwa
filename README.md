# SNG Finance PWA

This project uses Firebase for authentication and storage. To keep your Firebase credentials out of version control, the configuration is loaded from a separate `firebaseConfig.js` file that is ignored by git.

## Firebase Configuration

1. Copy `firebaseConfig.js.example` to `firebaseConfig.js` in the project root.
2. Fill in the values from your Firebase console:

```js
window.firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

The file `firebaseConfig.js` is listed in `.gitignore` so it will not be committed to the repository.

## Development

Open `index.html` in a browser or serve the directory with a simple HTTP server.
