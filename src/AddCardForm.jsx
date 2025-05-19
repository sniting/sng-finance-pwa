import React, { useState } from 'https://unpkg.com/react@18/umd/react.development.js';
import { db, auth } from './firebase.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js';

export default function AddCardForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState('debit');
  const [balance, setBalance] = useState('');
  const [limit, setLimit] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'cards'), {
      name,
      type,
      balance: parseFloat(balance || 0),
      creditLimit: parseFloat(limit || 0)
    });
    setName('');
    setBalance('');
    setLimit('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Card name" className="border p-2 w-full" />
      <select value={type} onChange={e => setType(e.target.value)} className="border p-2 w-full">
        <option value="debit">Debit</option>
        <option value="credit">Credit</option>
      </select>
      <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="Balance" className="border p-2 w-full" />
      <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Credit limit" className="border p-2 w-full" />
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Add Card</button>
    </form>
  );
}
