import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Store, 
  ShoppingCart, 
  IndianRupee,
  Search,
  ExternalLink,
  Eye
} from 'lucide-react';
import '../admin-dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalShops: 0,
    totalOrders: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all shops with owner details
        const { data: allShops } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false });

        if (allShops) {
          setShops(allShops);
          setStats(prev => ({
            ...prev,
            totalOwners: allShops.length,
            totalShops: allShops.length
          }));
        }

        // Fetch total orders count
        const { data: allOrders } = await supabase
          .from('orders')
          .select('total_amount, status');

        if (allOrders) {
          const delivered = allOrders.filter(o => o.status === 'delivered');
          const revenue = delivered.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          setStats(prev => ({
            ...prev,
            totalOrders: allOrders.length,
            totalRevenue: revenue
          }));
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const strftime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hh = String(hours).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${minutes}:${seconds} ${ampm}`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredShops = shops.filter(shop => {
    const query = searchQuery.toLowerCase();
    return (
      (shop.name || '').toLowerCase().includes(query) ||
      (shop.owner_name || '').toLowerCase().includes(query) ||
      (shop.mobile || '').includes(query) ||
      (shop.address || '').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#64748b' }}>Loading admin data...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple">
            <Users size={22} />
          </div>
          <div>
            <p className="admin-stat-label">Total Owners</p>
            <h3 className="admin-stat-value">{stats.totalOwners}</h3>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Store size={22} />
          </div>
          <div>
            <p className="admin-stat-label">Total Shops</p>
            <h3 className="admin-stat-value">{stats.totalShops}</h3>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <ShoppingCart size={22} />
          </div>
          <div>
            <p className="admin-stat-label">Total Orders</p>
            <h3 className="admin-stat-value">{stats.totalOrders}</h3>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon orange">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="admin-stat-label">Total Revenue</p>
            <h3 className="admin-stat-value">{formatCurrency(stats.totalRevenue)}</h3>
          </div>
        </div>
      </div>

      {/* Owners Table */}
      <div className="admin-section-header">
        <h3 className="admin-section-title">Registered Shop Owners</h3>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search owners..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {filteredShops.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-state-icon">
            <Users size={28} />
          </div>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>No shop owners found</p>
          <p style={{ fontSize: '0.8rem' }}>
            {searchQuery ? 'Try a different search query' : 'New owners will appear here after registration'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-owners-table">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Owner</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.map(shop => (
                <tr key={shop.id}>
                  <td>
                    <div className="admin-owner-name-cell">
                      <div className="admin-owner-avatar">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt={shop.name} />
                        ) : (
                          (shop.name || 'S')[0].toUpperCase()
                        )}
                      </div>
                      <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{shop.name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td>{shop.owner_name || '—'}</td>
                  <td>{shop.mobile || '—'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shop.address || '—'}
                  </td>
                  <td>
                    <span className={`admin-status-badge ${shop.holiday_mode ? 'holiday' : 'active'}`}>
                      {shop.holiday_mode ? 'Closed' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${shop.is_approved ? 'active' : 'holiday'}`}>
                      {shop.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {strftime(shop.created_at)}
                  </td>
                  <td>
                    <button
                      className="admin-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open the owner's customer menu in a new tab
                        window.open(`/menu/${shop.owner_unique_id || shop.id}`, '_blank');
                      }}
                    >
                      <Eye size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      View Menu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
