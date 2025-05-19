import { db } from './firebase.js';
import { showToast } from './ui.js';
import { currentUserId } from './auth.js';

export let remindersData = [];
export let unsubscribeReminders = null;

function getUserCollectionRef(collectionName) {
  if (!db || !currentUserId) {
    showToast('Data backend not ready.', 3000);
    return null;
  }
  return db.collection('users').doc(currentUserId).collection(collectionName);
}

export function setupReminderListener() {
  const ref = getUserCollectionRef('reminders');
  if (!ref) return;
  if (unsubscribeReminders) unsubscribeReminders();
  unsubscribeReminders = ref.orderBy('dueDate', 'asc').onSnapshot(snapshot => {
    remindersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.dispatchEvent(new CustomEvent('reminders-updated'));
  });
}

export async function addReminderToFirestore(reminder) {
  const ref = getUserCollectionRef('reminders');
  if (!ref) return;
  try {
    await ref.add({
      ...reminder,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Reminder added!');
  } catch (err) {
    console.error('Error adding reminder:', err);
    showToast('Failed to add reminder');
  }
}

export async function updateReminderInFirestore(reminder) {
  const ref = getUserCollectionRef('reminders');
  if (!ref || !reminder.id) return;
  try {
    const docRef = ref.doc(reminder.id.toString());
    await docRef.update({ ...reminder });
    showToast('Reminder updated!');
  } catch (err) {
    console.error('Error updating reminder:', err);
    showToast('Failed to update reminder');
  }
}

export async function deleteReminderFromFirestore(id) {
  const ref = getUserCollectionRef('reminders');
  if (!ref || !id) return;
  try {
    await ref.doc(id.toString()).delete();
    showToast('Reminder deleted');
  } catch (err) {
    console.error('Error deleting reminder:', err);
    showToast('Failed to delete reminder');
  }
}
