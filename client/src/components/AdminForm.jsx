import { useState } from 'react';
import axios from 'axios';

const AdminForm = () => {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the form from refreshing the page

    if (!ticker || !quantity) {
      alert('Please enter both a ticker and a quantity');
      return;
    }

    try {
      const newHolding = {
        ticker: ticker.toUpperCase(),
        quantity: parseFloat(quantity),
      };

      // Send the new holding to your backend API
      const response = await axios.post(
        'http://localhost:5000/api/portfolio/holdings',
        newHolding
      );

      console.log('Server response:', response.data);
      alert('Holding added successfully!');

      // Clear the form
      setTicker('');
      setQuantity('');

    } catch (error) {
      console.error('Error adding holding:', error);
      alert('Failed to add holding.');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', marginTop: '20px' }}>
      <h2>Admin: Add/Update Holding</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Ticker: </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g., TATASTEEL.NS"
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>Quantity: </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 100"
          />
        </div>
        <button type="submit" style={{ marginTop: '10px' }}>
          Submit
        </button>
      </form>
    </div>
  );
};

export default AdminForm;