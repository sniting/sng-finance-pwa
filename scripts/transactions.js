import { db } from './firebase.js';
import { showToast } from './ui.js';
import { currentUserId } from './auth.js';

export let transactionsData = [];
export let unsubscribeTransactions = null;

function getUserCollectionRef(collectionName) {
  if (!db || !currentUserId) {
    showToast('Data backend not ready.', 3000);
    return null;
  }
  return db.collection('users').doc(currentUserId).collection(collectionName);
}

export function setupTransactionListener() {
  const ref = getUserCollectionRef('transactions');
  if (!ref) return;
  if (unsubscribeTransactions) unsubscribeTransactions();
  unsubscribeTransactions = ref.orderBy('date', 'desc').onSnapshot(snapshot => {
    transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.dispatchEvent(new CustomEvent('transactions-updated'));
  });
}

export async function addTransactionToFirestore(transaction) {
  const ref = getUserCollectionRef('transactions');
  if (!ref) return;
  try {
    await ref.add({
      ...transaction,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Transaction added!');
  } catch (err) {
    console.error('Error adding transaction:', err);
    showToast('Failed to add transaction');
  }
}

export async function updateTransactionInFirestore(transaction) {
  const ref = getUserCollectionRef('transactions');
  if (!ref || !transaction.id) return;
  try {
    const docRef = ref.doc(transaction.id.toString());
    await docRef.update({ ...transaction });
    showToast('Transaction updated!');
  } catch (err) {
    console.error('Error updating transaction:', err);
    showToast('Failed to update transaction');
  }
}

export async function deleteTransactionFromFirestore(id) {
  const ref = getUserCollectionRef('transactions');
  if (!ref || !id) return;
  try {
    await ref.doc(id.toString()).delete();
    showToast('Transaction deleted');
  } catch (err) {
    console.error('Error deleting transaction:', err);
    showToast('Failed to delete transaction');
  }
}
