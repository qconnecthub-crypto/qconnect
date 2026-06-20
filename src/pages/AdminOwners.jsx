import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Search,
  Eye,
  Phone,
  MapPin,
  Calendar,
  Store
} from 'lucide-react';
import '../admin-dashboard.css';

const AdminOwners = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const { data: allShops } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false });

        if (allShops) setShops(allShops);
      } catch (err) {
        console.error('Error fetching owners:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOwners();
  }, []);

  const handleApprove = async (shopId, shopName) => {
    if (!window.confirm(`Are you sure you want to approve "${shopName}"?`)) return;
    try {
      const { error } = await supabase
        .from('shops')
        .update({ is_approved: true })
        .eq('id', shopId);

      if (error) throw error;

      setShops(prev => prev.map(s => s.id === shopId ? { ...s, is_approved: true } : s));
    } catch (err) {
      console.error('Failed to approve shop:', err.message);
      alert('Failed to approve shop: ' + err.message);
    }
  };

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
        <div style={{ color: '#64748b' }}>Loading owners...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-section-header" style={{ marginBottom: '1.5rem' }}>
        <h3 className="admin-section-title">
          All Registered Owners ({filteredShops.length})
        </h3>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, mobile, address..."
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
          <p style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>No owners found</p>
          <p style={{ fontSize: '0.8rem' }}>
            {searchQuery ? 'Try a different search query' : 'New owners will appear here after registration'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-owners-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Shop Name</th>
                <th>Owner Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Tables</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.map((shop, index) => (
                <tr key={shop.id}>
                  <td style={{ color: '#475569', fontSize: '0.8rem' }}>{index + 1}</td>
                  <td>
                    <div className="admin-owner-name-cell">
                      <div className="admin-owner-avatar">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt={shop.name} />
                        ) : (
                          <Store size={16} />
                        )}
                      </div>
                      <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{shop.name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td>{shop.owner_name || '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{shop.email || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} style={{ color: '#64748b' }} />
                      {shop.mobile || '—'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{shop.tables || '—'}</td>
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
                  <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {strftime(shop.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="admin-view-btn"
                        onClick={() => window.open(`/menu/${shop.owner_unique_id || shop.id}`, '_blank')}
                      >
                        <Eye size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        View
                      </button>
                      
                      {!shop.is_approved && (
                        <button
                          className="admin-view-btn"
                          style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            borderColor: 'rgba(139, 92, 246, 0.4)',
                            color: '#a78bfa'
                          }}
                          onClick={() => handleApprove(shop.id, shop.name)}
                        >
                          Approve
                        </button>
                      )}
                    </div>
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

export default AdminOwners;
