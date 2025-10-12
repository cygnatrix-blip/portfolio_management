import AdminDashboard from './AdminDashboard';
import CreateClientForm from '../components/CreateClientForm';
import UnifiedTransactionForm from '../components/UnifiedTransactionForm';
import DailyPriceForm from '../components/DailyPriceForm'; // 1. Import the new DailyPriceForm

const AdminHomePage = () => {
  return (
    <div>
      <AdminDashboard />

      <hr style={{ margin: '40px 0', border: '2px solid #ccc' }} />

      <h2>Admin Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        <div>
          {/* This is the main form for all transactions */}
          <UnifiedTransactionForm />
        </div>

        <div>
          {/* These are the other essential admin forms */}
          <DailyPriceForm />
          <CreateClientForm />
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;

