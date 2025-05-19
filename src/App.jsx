import React from 'https://unpkg.com/react@18/umd/react.development.js';
import AddCardForm from './AddCardForm.jsx';
import CardList from './CardList.jsx';

export default function App() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Cards</h2>
      <AddCardForm />
      <CardList />
    </div>
  );
}
