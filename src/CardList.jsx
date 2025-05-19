import React, { useEffect, useState } from 'https://unpkg.com/react@18/umd/react.development.js';
import { db, auth } from './firebase.js';
import { collection, onSnapshot, deleteDoc, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js';

export default function CardList() {
  const [cards, setCards] = useState([]);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'cards');
    const unsub = onSnapshot(ref, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCards(list);
    });
    return unsub;
  }, []);

  const startRename = (card) => {
    setRenaming(card.id);
    setNewName(card.name);
  };

  const saveRename = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'cards', id), { name: newName });
    setRenaming(null);
  };

  const remove = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'cards', id));
  };

  return (
    <ul className="space-y-2 mt-4">
      {cards.map(card => (
        <li key={card.id} className="border p-2 rounded flex justify-between">
          {renaming === card.id ? (
            <>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="border px-1 mr-2" />
              <button onClick={() => saveRename(card.id)} className="text-sm text-blue-600 mr-2">Save</button>
            </>
          ) : (
            <span>{card.name} - {card.type} - ${'{'}card.balance{'}'}</span>
          )}
          <div>
            <button onClick={() => startRename(card)} className="text-sm text-blue-600 mr-2">Rename</button>
            <button onClick={() => remove(card.id)} className="text-sm text-red-600">Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
