import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, isMockMode } from '../lib/supabase';
import {
  Store, Search, Filter, Plus, Eye, Trash2, Pause, Play,
  CheckCircle, XCircle, ChevronDown, MapPin, Phone
} from 'lucide-react';

const getDB = () => {
  const raw = localStorage.getItem('supabase_mock_db');
  if (!raw) return { shops: [], registrations: [], users: [], shop_tables: [] };
  const db = JSON.parse(raw);
  db.shops = db.shops || [];
  db.registrations = db.registrations || [];
  db.users = db.users || [];
  db.shop_tables = db.shop_tables || [];
  return db;
};

const saveDB = (db) => {
  localStorage.setItem('supabase_mock_db', JSON.stringify(db));
  localStorage.setItem('supabase_mock_broadcast', JSON.stringify({
    tableName: 'shops',
    eventType: 'UPDATE',
    timestamp: Date.now()
  }));
};

const AdminOwners = () => {
  const { user } = useOutletContext();
  const [db, setDb] = useState(getDB);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const [dbError, setDbError] = useState(null);

  const refreshDB = useCallback(async () => {
    if (isMockMode) {
      setDb(getDB());
      setDbError(null);
    } else {
      try {
        const { data: shops, error } = await supabase.from('shops').select('*');
        if (error) {
          setDbError(`Shops query failed: ${error.message} (${error.code})`);
          return;
        }
        setDb({
          shops: shops || [],
          registrations: [],
          users: [], // placeholder for owner checks compatibility
          shop_tables: []
        });
        setDbError(null);
      } catch (err) {
        console.error('Error fetching shops in AdminOwners:', err);
        setDbError(`Unexpected error: ${err.message || err}`);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshDB();
    }, 0);
    const interval = setInterval(refreshDB, 3000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refreshDB]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'supabase_mock_db' || e.key === 'supabase_mock_broadcast') refreshDB();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshDB]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Filter shops
  const filteredShops = db.shops.filter(shop => {
    const matchesSearch = !search ||
      shop.name?.toLowerCase().includes(search.toLowerCase()) ||
      shop.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      shop.address?.toLowerCase().includes(search.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && shop.status === 'published' && !shop.holiday_mode;
    if (filter === 'holiday') return matchesSearch && shop.holiday_mode;
    if (filter === 'suspended') return matchesSearch && shop.status === 'suspended';
    return matchesSearch;
  });

  const tabCounts = {
    all: db.shops.length,
    active: db.shops.filter(s => s.status === 'published' && !s.holiday_mode).length,
    holiday: db.shops.filter(s => s.holiday_mode).length,
    suspended: db.shops.filter(s => s.status === 'suspended').length
  };

  const toggleShopStatus = async (shopId) => {
    if (isMockMode) {
      const currentDB = getDB();
      const shop = currentDB.shops.find(s => s.id === shopId);
      if (!shop) return;
      if (shop.status === 'suspended') {
        shop.status = 'published';
        showToast(`✅ ${shop.name} reactivated`);
      } else {
        shop.status = 'suspended';
        showToast(`⏸ ${shop.name} suspended`);
      }
      saveDB(currentDB);
      refreshDB();
    } else {
      try {
        const shop = db.shops.find(s => s.id === shopId);
        if (!shop) return;

        const newStatus = shop.status === 'suspended' ? 'published' : 'suspended';
        const { error } = await supabase.from('shops')
          .update({ status: newStatus })
          .eq('id', shopId);
        if (error) throw error;

        showToast(newStatus === 'published' ? `✅ ${shop.name} reactivated` : `⏸ ${shop.name} suspended`);
        refreshDB();
      } catch (err) {
        console.error('Error toggling shop status:', err);
        alert(`Failed to update shop status: ${err.message}`);
      }
    }
  };

  const deleteShop = async (shopId) => {
    if (!confirm('Are you sure you want to delete this shop?')) return;
    
    if (isMockMode) {
      const currentDB = getDB();
      const shop = currentDB.shops.find(s => s.id === shopId);
      currentDB.shops = currentDB.shops.filter(s => s.id !== shopId);
      currentDB.shop_tables = (currentDB.shop_tables || []).filter(t => t.shop_id !== shopId);
      saveDB(currentDB);
      refreshDB();
      showToast(`🗑 Deleted ${shop?.name || 'shop'}`);
    } else {
      try {
        const shop = db.shops.find(s => s.id === shopId);
        const { error } = await supabase.from('shops').delete().eq('id', shopId);
        if (error) throw error;

        showToast(`🗑 Deleted ${shop?.name || 'shop'}`);
        refreshDB();
      } catch (err) {
        console.error('Error deleting shop:', err);
        alert(`Failed to delete shop: ${err.message}`);
      }
    }
  };

  const getShopOwner = (shop) => {
    return db.users.find(u => u.id === shop.user_id);
  };

  const getStatusBadge = (shop) => {
    if (shop.status === 'suspended') return { label: 'Suspended', cls: 'suspended' };
    if (shop.holiday_mode) return { label: 'Holiday', cls: 'holiday' };
    return { label: 'Active', cls: 'active' };
  };

  return (
    <div className="admin-owners-page">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        fontSize: '0.85rem',
        fontWeight: '600',
        background: isMockMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        border: isMockMode ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
        color: isMockMode ? '#f87171' : '#34d399'
      }}>
        <span>Database Mode: {isMockMode ? '⚠️ Mock Mode (Local Storage)' : '🟢 Real Supabase Connected'}</span>
      </div>
      {dbError && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          marginBottom: '20px',
          fontSize: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{ fontWeight: 'bold' }}>⚠️ Database Query Error:</span>
          <span>{dbError}</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Please verify that you have run all SQL migration scripts in your Supabase SQL editor.</span>
        </div>
      )}
      <style>{`
        .admin-owners-page { animation: fadeInAdmin 0.3s ease; }
        @keyframes fadeInAdmin { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        
        .ao-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .ao-header-left h2 { font-size: 1.3rem; font-weight: 700; color: #f1f5f9; margin: 0; }
        .ao-header-left p { font-size: 0.8rem; color: #64748b; margin: 4px 0 0; }
        
        .ao-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
        .ao-tab {
          padding: 8px 16px; border-radius: 8px; border: none;
          background: rgba(255,255,255,0.03); color: #94a3b8;
          font-size: 0.82rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .ao-tab:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .ao-tab.active { background: rgba(139,92,246,0.12); color: #a78bfa; }
        .ao-tab-count { font-size: 0.7rem; margin-left: 4px; opacity: 0.7; }
        
        .ao-search-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .ao-search-box {
          flex: 1; display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 0 14px;
        }
        .ao-search-box input {
          flex: 1; border: none; background: transparent; color: #f1f5f9;
          padding: 10px 0; font-size: 0.88rem; outline: none;
        }
        .ao-search-box input::placeholder { color: #475569; }
        
        .ao-table-wrap {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; overflow: hidden;
        }
        .ao-table { width: 100%; border-collapse: collapse; }
        .ao-table thead { background: rgba(255,255,255,0.03); }
        .ao-table th {
          text-align: left; padding: 12px 16px; font-size: 0.72rem;
          font-weight: 600; color: #64748b; text-transform: uppercase;
          letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ao-table td {
          padding: 14px 16px; font-size: 0.88rem; color: #cbd5e1;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .ao-table tbody tr { transition: background 0.15s; }
        .ao-table tbody tr:hover { background: rgba(139,92,246,0.04); }
        .ao-table tbody tr:last-child td { border-bottom: none; }
        
        .ao-shop-cell { display: flex; align-items: center; gap: 10px; }
        .ao-shop-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.06));
          display: flex; align-items: center; justify-content: center;
          color: #a78bfa; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
          overflow: hidden;
        }
        .ao-shop-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .ao-shop-name { font-weight: 600; color: #e2e8f0; }
        .ao-shop-category { font-size: 0.72rem; color: #64748b; }
        
        .ao-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        .ao-badge.active { background: rgba(34,197,94,0.1); color: #4ade80; }
        .ao-badge.holiday { background: rgba(239,68,68,0.1); color: #f87171; }
        .ao-badge.suspended { background: rgba(245,158,11,0.1); color: #fbbf24; }
        
        .ao-action-btn {
          padding: 5px 10px; border-radius: 6px; border: none;
          font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .ao-action-btn.view { background: rgba(139,92,246,0.08); color: #a78bfa; }
        .ao-action-btn.view:hover { background: rgba(139,92,246,0.2); }
        .ao-action-btn.toggle { background: rgba(245,158,11,0.08); color: #fbbf24; }
        .ao-action-btn.toggle:hover { background: rgba(245,158,11,0.2); }
        .ao-action-btn.delete { background: rgba(239,68,68,0.06); color: #f87171; }
        .ao-action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        
        .ao-empty { text-align: center; padding: 48px 16px; color: #475569; }
        .ao-empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.3; }
        
        .ao-toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          background: #1e1e2e; border: 1px solid rgba(139,92,246,0.3);
          padding: 14px 20px; border-radius: 12px; color: #e2e8f0;
          font-size: 0.88rem; font-weight: 500;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          animation: slideUpToast 0.3s ease;
        }
        @keyframes slideUpToast { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        
        @media (max-width: 768px) {
          .ao-table-wrap { overflow-x: auto; }
          .ao-header { flex-direction: column; align-items: flex-start; }
          .ao-search-row { flex-direction: column; }
        }
      `}</style>

      {/* Header */}
      <div className="ao-header">
        <div className="ao-header-left">
          <h2>Shop Management</h2>
          <p>Manage all registered shops and owners</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="ao-tabs">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'holiday', label: 'Holiday' },
          { key: 'suspended', label: 'Suspended' }
        ].map(tab => (
          <button
            key={tab.key}
            className={`ao-tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            <span className="ao-tab-count">({tabCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="ao-search-row">
        <div className="ao-search-box">
          <Search size={15} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by shop name, owner, address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Shops Table */}
      <div className="ao-table-wrap">
        <table className="ao-table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Owner</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Status</th>
              <th>Tables</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShops.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="ao-empty">
                    <div className="ao-empty-icon">🏪</div>
                    <p>{search ? 'No shops match your search' : 'No shops found'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredShops.map(shop => {
                const owner = getShopOwner(shop);
                const badge = getStatusBadge(shop);
                return (
                  <tr key={shop.id}>
                    <td>
                      <div className="ao-shop-cell">
                        <div className="ao-shop-avatar">
                          {shop.logo_url
                            ? <img src={shop.logo_url} alt={shop.name} />
                            : shop.name?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="ao-shop-name">{shop.name}</div>
                          <div className="ao-shop-category">{shop.category || 'Restaurant'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{shop.owner_name || owner?.full_name || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{shop.mobile || '—'}</td>
                    <td style={{ fontSize: '0.82rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shop.address || '—'}</td>
                    <td><span className={`ao-badge ${badge.cls}`}>{badge.label}</span></td>
                    <td>{shop.tables || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="ao-action-btn toggle"
                          title={shop.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          onClick={() => toggleShopStatus(shop.id)}
                        >
                          {shop.status === 'suspended' ? <Play size={12} /> : <Pause size={12} />}
                        </button>
                        <button
                          className="ao-action-btn delete"
                          title="Delete"
                          onClick={() => deleteShop(shop.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className="ao-toast">{toast}</div>}
    </div>
  );
};

export default AdminOwners;
