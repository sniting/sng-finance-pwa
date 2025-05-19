# SNG Finance PWA

This repository contains a small proof‑of‑concept Progressive Web App (PWA) for tracking student finances. The app is a static site that communicates with Firebase for authentication and data storage.

## Prerequisites

- **Node.js** (v14 or later recommended) installed on your system.
- Access to a **Firebase project** and a service account key file (JSON) for administrative scripts.

## Serving the PWA Locally

1. Install a simple static server if you do not already have one. One option is [`serve`](https://www.npmjs.com/package/serve):
   ```bash
   npm install -g serve
   ```
2. From the repository root, run:
   ```bash
   serve -s .
   ```
   The application will be available in your browser at the address printed in the console (typically `http://localhost:3000`).

## Firebase Configuration

The app requires Firebase credentials to connect to your project. Edit `index.html` and replace the placeholder values inside `firebaseConfig` with your own Firebase project settings:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Save the file after updating these values, then refresh the app in the browser.

## Running `renameFirestoreDocument.js`

`renameFirestoreDocument.js` is a Node.js script for copying a Firestore document (along with any subcollections) to a new location and deleting the original. **Use with caution** and test thoroughly in a non‑production environment.

1. Install the required dependency:
   ```bash
   npm install firebase-admin
   ```
2. Provide the path to your Firebase service account key JSON file. You can either set the `SERVICE_ACCOUNT` environment variable or pass the file path as the first command‑line argument.
3. Execute the script using Node.js:
   ```bash
   node renameFirestoreDocument.js path/to/serviceAccount.json
   ```
   If the `SERVICE_ACCOUNT` variable is set, you may omit the argument.

The script currently copies the document at `users/sharedUserData` to `users/nitin` and then removes the original.
