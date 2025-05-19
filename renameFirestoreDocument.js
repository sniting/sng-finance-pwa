// renameFirestoreDocument.js
// Node.js script to effectively rename a Firestore document by copying all data
// and subcollections and then deleting the original document.
//
// Usage:
//   1. Install dependencies: npm install firebase-admin
//   2. Supply a Firebase service account key JSON file path via the SERVICE_ACCOUNT
//      environment variable or pass it as the first command line argument.
//   3. Run the script with: node renameFirestoreDocument.js [path/to/serviceAccount.json]
//
// WARNING: This script performs destructive operations. Ensure you have a backup
// of your data before executing and test thoroughly in a non-production
// environment first.

const admin = require('firebase-admin');
const path = require('path');

// Resolve service account path
const serviceAccountPath = process.env.SERVICE_ACCOUNT || process.argv[2];
if (!serviceAccountPath) {
  console.error('Service account key file path must be provided.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(serviceAccountPath)))
});

const db = admin.firestore();

// Source and destination document paths
const SRC_PATH = 'users/sharedUserData';
const DEST_PATH = 'users/nitin';

/**
 * Recursively copy a document and all of its subcollections.
 * @param {FirebaseFirestore.DocumentReference} srcRef
 * @param {FirebaseFirestore.DocumentReference} destRef
 */
async function copyDocument(srcRef, destRef) {
  const snap = await srcRef.get();
  if (!snap.exists) {
    console.error(`Source document ${srcRef.path} does not exist.`);
    return;
  }

  await destRef.set(snap.data(), { merge: true });

  const subcollections = await srcRef.listCollections();
  for (const subCol of subcollections) {
    const destSubCol = destRef.collection(subCol.id);
    const docsSnap = await subCol.get();
    for (const subDoc of docsSnap.docs) {
      await copyDocument(subDoc.ref, destSubCol.doc(subDoc.id));
    }
  }
}

/**
 * Recursively delete a document and all of its subcollections.
 * @param {FirebaseFirestore.DocumentReference} docRef
 */
async function deleteDocumentWithSubcollections(docRef) {
  const subcollections = await docRef.listCollections();
  for (const subCol of subcollections) {
    const docs = await subCol.listDocuments();
    for (const doc of docs) {
      await deleteDocumentWithSubcollections(doc);
    }
  }
  await docRef.delete();
}

(async () => {
  const srcRef = db.doc(SRC_PATH);
  const destRef = db.doc(DEST_PATH);

  console.log(`Copying ${SRC_PATH} -> ${DEST_PATH}`);
  await copyDocument(srcRef, destRef);
  console.log('Copy complete. Deleting original document...');
  await deleteDocumentWithSubcollections(srcRef);
  console.log('Original document deleted.');
})();
