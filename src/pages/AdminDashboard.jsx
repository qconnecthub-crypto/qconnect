import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, isMockMode } from '../lib/supabase';
import {
  Store, Users, Clock, IndianRupee, QrCode, ShoppingCart, Zap,
  CheckCircle, XCircle, ChevronRight, TrendingUp, RefreshCw
} from 'lucide-react';

// Helper: read mock DB
const getDB = () => {
  const raw = localStorage.getItem('supabase_mock_db');
  if (!raw) return { shops: [], registrations: [], users: [], notifications: [], orders: [], menu_views: [] };
  const db = JSON.parse(raw);
  db.shops = db.shops || [];
  db.registrations = db.registrations || [];
  db.users = db.users || [];
  db.notifications = db.notifications || [];
  db.orders = db.orders || [];
  db.menu_views = db.menu_views || [];
  db.shop_tables = db.shop_tables || [];
  db.categories = db.categories || [];
  db.subscriptions = db.subscriptions || [];
  return db;
};

const saveDB = (db) => {
  localStorage.setItem('supabase_mock_db', JSON.stringify(db));
  localStorage.setItem('supabase_mock_broadcast', JSON.stringify({
    tableName: 'admin_update',
    eventType: 'UPDATE',
    timestamp: Date.now()
  }));
};

const AdminDashboard = () => {
  const { user } = useOutletContext();
  const [db, setDb] = useState(getDB);
  const [toast, setToast] = useState(null);

  // Reload DB state
  const refreshDB = useCallback(async () => {
    if (isMockMode) {
      setDb(getDB());
    } else {
      try {
        const [shopsRes, regsRes] = await Promise.all([
          supabase.from('shops').select('*'),
          supabase.from('registrations').select('*')
        ]);
        setDb({
          shops: shopsRes.data || [],
          registrations: regsRes.data || [],
          users: [], // placeholder for DB shape compatibility
          notifications: [],
          orders: [],
          menu_views: []
        });
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
      }
    }
  }, []);

  // Auto-refresh every 3 seconds for live status
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

  // Listen for cross-tab changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'supabase_mock_db' || e.key === 'supabase_mock_broadcast') {
        refreshDB();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshDB]);

  // Show toast
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // ─── APPROVE REGISTRATION ───
  const approveRegistration = async (regId) => {
    if (isMockMode) {
      const currentDB = getDB();
      const regIdx = currentDB.registrations.findIndex(r => r.id === regId);
      if (regIdx === -1) return;
      const reg = currentDB.registrations[regIdx];

      // 1. Create owner user
      const newUserId = 'user-' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        id: newUserId,
        email: reg.email.toLowerCase(),
        password: 'password123',
        full_name: reg.owner_name,
        role: 'owner'
      };

      // 2. Create shop
      const newShopId = 'shop-' + Math.random().toString(36).substr(2, 9);
      const shopSlug = reg.shop_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const tableCount = parseInt(reg.tables) || 5;
      const newShop = {
        id: newShopId,
        user_id: newUserId,
        name: reg.shop_name,
        owner_name: reg.owner_name,
        tables: tableCount,
        logo_url: reg.logo_url || null,
        status: 'published',
        owner_unique_id: shopSlug,
        theme_color: 'dark',
        description: `Welcome to ${reg.shop_name}`,
        open_time: '09:00',
        close_time: '22:00',
        mobile: reg.mobile,
        address: reg.address,
        category: reg.category || 'Restaurant',
        created_at: new Date().toISOString(),
        holiday_mode: false,
        accept_orders: true,
        auto_approval: false
      };

      // 3. Generate tables with QR
      for (let i = 1; i <= tableCount; i++) {
        currentDB.shop_tables.push({
          id: 'table-' + Math.random().toString(36).substr(2, 9),
          shop_id: newShopId,
          table_number: i,
          table_code: newShopId + '_table_' + i,
          qr_url: window.location.origin + '/menu/' + shopSlug + '?table=' + i,
          is_active: true,
          table_token: String(i)
        });
      }

      // 4. Default category
      currentDB.categories.push({
        id: 'cat-' + Math.random().toString(36).substr(2, 9),
        shop_id: newShopId,
        name: 'Main Menu',
        icon: 'grid'
      });

      // 5. Subscription
      if (!currentDB.subscriptions) currentDB.subscriptions = [];
      currentDB.subscriptions.push({
        id: 'sub-' + Math.random().toString(36).substr(2, 9),
        shop_id: newShopId,
        plan: 'Premium',
        status: 'ACTIVE'
      });

      currentDB.users.push(newUser);
      currentDB.shops.push(newShop);
      currentDB.registrations.splice(regIdx, 1);

      currentDB.notifications.unshift({
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        shop_id: newShopId,
        type: 'approved',
        title: 'Registration Approved',
        message: `Activated ${reg.shop_name}! ${tableCount} tables & QR codes generated.`,
        created_at: new Date().toISOString(),
        read: false
      });

      saveDB(currentDB);
      refreshDB();
      showToast(`✅ Approved ${reg.shop_name}! ${tableCount} Tables & QR Codes created.`);
    } else {
      try {
        const reg = db.registrations.find(r => r.id === regId);
        if (!reg) return;

        const shopSlug = reg.shop_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const tableCount = parseInt(reg.tables) || 5;

        // 1. Create shop
        const { data: newShop, error: shopError } = await supabase.from('shops').insert([
          {
            user_id: reg.user_id,
            name: reg.shop_name,
            owner_name: reg.owner_name,
            tables: tableCount,
            logo_url: reg.logo_url || null,
            status: 'published',
            owner_unique_id: shopSlug,
            theme_color: 'dark',
            description: `Welcome to ${reg.shop_name}`,
            open_time: '09:00',
            close_time: '22:00',
            mobile: reg.mobile,
            address: reg.address,
            category: reg.category || 'Restaurant'
          }
        ]).select().single();

        if (shopError) throw shopError;

        // 2. Generate tables
        const tableInserts = [];
        for (let i = 1; i <= tableCount; i++) {
          tableInserts.push({
            shop_id: newShop.id,
            table_number: i,
            table_code: newShop.id + '_table_' + i,
            qr_url: window.location.origin + '/menu/' + shopSlug + '?table=' + i,
            is_active: true,
            table_token: String(i)
          });
        }
        const { error: tablesError } = await supabase.from('shop_tables').insert(tableInserts);
        if (tablesError) throw tablesError;

        // 3. Create default category
        const { error: catError } = await supabase.from('categories').insert([
          {
            shop_id: newShop.id,
            name: 'Main Menu',
            icon: 'grid'
          }
        ]);
        if (catError) throw catError;

        // 4. Update registration status
        const { error: regUpdateError } = await supabase.from('registrations')
          .update({ 
            status: 'APPROVED',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.email || 'Admin'
          })
          .eq('id', regId);
        if (regUpdateError) throw regUpdateError;

        // 5. Send notification
        await supabase.from('notifications').insert([
          {
            shop_id: newShop.id,
            type: 'approved',
            title: 'Registration Approved',
            message: `Activated ${reg.shop_name}! ${tableCount} tables & QR codes generated.`,
            is_read: false
          }
        ]);

        refreshDB();
        showToast(`✅ Approved ${reg.shop_name}! ${tableCount} Tables & QR Codes created.`);
      } catch (err) {
        console.error('Error approving registration:', err);
        alert(`Failed to approve: ${err.message}`);
      }
    }
  };

  // ─── REJECT REGISTRATION ───
  const rejectRegistration = async (regId) => {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;

    if (isMockMode) {
      const currentDB = getDB();
      const regIdx = currentDB.registrations.findIndex(r => r.id === regId);
      if (regIdx === -1) return;
      const reg = currentDB.registrations[regIdx];
      currentDB.registrations[regIdx].status = 'REJECTED';
      currentDB.registrations[regIdx].rejection_reason = reason;
      saveDB(currentDB);
      refreshDB();
      showToast(`❌ Rejected ${reg.shop_name}`);
    } else {
      try {
        const reg = db.registrations.find(r => r.id === regId);
        if (!reg) return;

        const { error } = await supabase.from('registrations')
          .update({ 
            status: 'REJECTED', 
            rejection_reason: reason,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.email || 'Admin'
          })
          .eq('id', regId);
        if (error) throw error;

        refreshDB();
        showToast(`❌ Rejected ${reg.shop_name}`);
      } catch (err) {
        console.error('Error rejecting registration:', err);
        alert(`Failed to reject: ${err.message}`);
      }
    }
  };

  // ─── KPI Data ───
  const totalShops = db.shops.length;
  const activeShops = db.shops.filter(s => s.status === 'published' && !s.holiday_mode).length;
  const pendingRegs = db.registrations.filter(r => r.status === 'PENDING').length;
  const chartData = [18, 32, 28, 45, 52, totalShops || 60];
  const chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const maxChart = Math.max(...chartData, 1);

  // Top shops (by number of tables as proxy for size)
  const topShops = [...db.shops]
    .sort((a, b) => (b.tables || 0) - (a.tables || 0))
    .slice(0, 4);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-dashboard-page">
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
        {!isMockMode && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>URL: {supabase.supabaseUrl}</span>}
      </div>
      <style>{`
        .admin-dashboard-page { animation: fadeInAdmin 0.3s ease; }
        @keyframes fadeInAdmin { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        
        .adm-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .adm-kpi-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 20px; display: flex; align-items: flex-start; gap: 14px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .adm-kpi-card:hover { transform: translateY(-3px); border-color: rgba(139,92,246,0.25); }
        .adm-kpi-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .adm-kpi-icon.purple { background: rgba(139,92,246,0.12); color: #a78bfa; }
        .adm-kpi-icon.blue { background: rgba(14,165,233,0.12); color: #38bdf8; }
        .adm-kpi-icon.amber { background: rgba(245,158,11,0.12); color: #fbbf24; }
        .adm-kpi-icon.green { background: rgba(34,197,94,0.12); color: #4ade80; }
        .adm-kpi-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin: 0 0 4px; }
        .adm-kpi-value { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 0; }
        .adm-kpi-delta { font-size: 0.72rem; color: #4ade80; margin-top: 4px; }
        
        .adm-grid-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 24px; }
        .adm-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 20px; overflow: hidden;
        }
        .adm-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .adm-card-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; }
        .adm-card-sub { font-size: 0.75rem; color: #64748b; }
        
        .adm-chart-wrap { position: relative; height: 180px; display: flex; align-items: flex-end; gap: 12px; padding: 0 4px; }
        .adm-chart-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .adm-chart-bar {
          width: 100%; border-radius: 6px 6px 0 0;
          background: linear-gradient(180deg, rgba(139,92,246,0.7), rgba(139,92,246,0.2));
          transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        .adm-chart-bar:hover { background: linear-gradient(180deg, rgba(139,92,246,0.9), rgba(139,92,246,0.4)); }
        .adm-chart-label { font-size: 0.7rem; color: #64748b; }
        .adm-chart-val { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 0.7rem; color: #a78bfa; font-weight: 600; }
        
        .adm-mini-stat { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .adm-mini-stat:last-child { border-bottom: none; }
        .adm-mini-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; background: rgba(255,255,255,0.04); }
        .adm-mini-label { font-size: 0.78rem; color: #94a3b8; }
        .adm-mini-val { font-size: 1rem; font-weight: 700; color: #f1f5f9; }
        .adm-bar-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; margin-top: 6px; }
        .adm-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #8b5cf6, #6d28d9); transition: width 0.5s ease; }
        
        .adm-reg-item {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; margin-bottom: 10px; transition: border-color 0.2s;
        }
        .adm-reg-item:hover { border-color: rgba(139,92,246,0.2); }
        .adm-reg-avatar {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.08));
          display: flex; align-items: center; justify-content: center;
          color: #a78bfa; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
        }
        .adm-reg-info { flex: 1; min-width: 0; }
        .adm-reg-name { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; }
        .adm-reg-meta { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
        .adm-reg-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .adm-btn-approve {
          display: flex; align-items: center; gap: 4px; padding: 7px 14px;
          border-radius: 8px; border: none; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          background: rgba(34,197,94,0.12); color: #4ade80;
        }
        .adm-btn-approve:hover { background: rgba(34,197,94,0.25); }
        .adm-btn-reject {
          display: flex; align-items: center; gap: 4px; padding: 7px 14px;
          border-radius: 8px; border: none; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          background: rgba(239,68,68,0.08); color: #f87171;
        }
        .adm-btn-reject:hover { background: rgba(239,68,68,0.18); }
        
        .adm-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        .adm-badge-pending { background: rgba(245,158,11,0.12); color: #fbbf24; }
        .adm-badge-live { animation: livePulse 2s ease-in-out infinite; }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        
        .adm-top-shop { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .adm-top-shop:last-child { border-bottom: none; }
        .adm-top-shop-rank { width: 24px; height: 24px; border-radius: 6px; background: rgba(139,92,246,0.12); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #a78bfa; }
        .adm-top-shop-name { flex: 1; font-size: 0.85rem; font-weight: 500; color: #e2e8f0; }
        .adm-top-shop-tables { font-size: 0.75rem; color: #64748b; }
        
        .adm-empty { text-align: center; padding: 32px 16px; color: #475569; }
        .adm-empty-icon { font-size: 2rem; margin-bottom: 8px; opacity: 0.4; }
        
        .adm-toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          background: #1e1e2e; border: 1px solid rgba(139,92,246,0.3);
          padding: 14px 20px; border-radius: 12px; color: #e2e8f0;
          font-size: 0.88rem; font-weight: 500;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          animation: slideUpToast 0.3s cubic-bezier(0.18,0.89,0.32,1.28);
        }
        @keyframes slideUpToast { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        
        .adm-refresh-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 14px;
          border-radius: 8px; border: 1px solid rgba(139,92,246,0.2);
          background: rgba(139,92,246,0.06); color: #a78bfa;
          font-size: 0.78rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .adm-refresh-btn:hover { background: rgba(139,92,246,0.15); }
        
        @media (max-width: 768px) {
          .adm-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .adm-grid-2 { grid-template-columns: 1fr; }
          .adm-reg-actions { flex-direction: column; }
        }
      `}</style>

      {/* ─── KPI CARDS ─── */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon purple"><Store size={20} /></div>
          <div>
            <p className="adm-kpi-label">Total Shops</p>
            <p className="adm-kpi-value">{totalShops}</p>
            <p className="adm-kpi-delta">▲ +{Math.max(1, Math.floor(totalShops * 0.12))} this month</p>
          </div>
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon blue"><Users size={20} /></div>
          <div>
            <p className="adm-kpi-label">Active Shops</p>
            <p className="adm-kpi-value">{activeShops}</p>
            <p className="adm-kpi-delta">▲ {totalShops > 0 ? Math.round((activeShops / totalShops) * 100) : 0}% active rate</p>
          </div>
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon amber"><Clock size={20} /></div>
          <div>
            <p className="adm-kpi-label">Pending Requests</p>
            <p className="adm-kpi-value">{pendingRegs}</p>
            <p className="adm-kpi-delta" style={{ color: pendingRegs > 0 ? '#fbbf24' : '#4ade80' }}>
              {pendingRegs > 0 ? '⏳ Awaiting review' : '✓ All clear'}
            </p>
          </div>
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon green"><IndianRupee size={20} /></div>
          <div>
            <p className="adm-kpi-label">Revenue Monthly</p>
            <p className="adm-kpi-value">₹24,500</p>
            <p className="adm-kpi-delta">▲ 18% vs last month</p>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: Chart + Quick Stats ─── */}
      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <span className="adm-card-title">Shop Growth</span>
            <span className="adm-card-sub">Jan – Jun 2026</span>
          </div>
          <div className="adm-chart-wrap">
            {chartData.map((val, idx) => (
              <div className="adm-chart-bar-group" key={idx}>
                <div className="adm-chart-bar" style={{ height: `${(val / maxChart) * 140}px` }}>
                  <span className="adm-chart-val">{val}</span>
                </div>
                <span className="adm-chart-label">{chartMonths[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <span className="adm-card-title">Quick Stats</span>
          </div>
          <div>
            <div className="adm-mini-stat">
              <div className="adm-mini-icon"><QrCode size={16} /></div>
              <div style={{ flex: 1 }}>
                <div className="adm-mini-label">QR Scans Today</div>
                <div className="adm-mini-val">1,245</div>
                <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: '82%' }}></div></div>
              </div>
            </div>
            <div className="adm-mini-stat">
              <div className="adm-mini-icon"><ShoppingCart size={16} /></div>
              <div style={{ flex: 1 }}>
                <div className="adm-mini-label">Orders Today</div>
                <div className="adm-mini-val">{db.orders.length || 456}</div>
                <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: '60%' }}></div></div>
              </div>
            </div>
            <div className="adm-mini-stat">
              <div className="adm-mini-icon"><Zap size={16} /></div>
              <div style={{ flex: 1 }}>
                <div className="adm-mini-label">Avg Response Time</div>
                <div className="adm-mini-val">1.2s</div>
                <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: '95%' }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: Pending Registrations + Top Shops ─── */}
      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <span className="adm-card-title">
              Pending Registrations
              {pendingRegs > 0 && (
                <span className="adm-badge adm-badge-pending adm-badge-live" style={{ marginLeft: 8 }}>
                  {pendingRegs}
                </span>
              )}
            </span>
            <button className="adm-refresh-btn" onClick={refreshDB}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {db.registrations.filter(r => r.status === 'PENDING').length === 0 ? (
            <div className="adm-empty">
              <div className="adm-empty-icon">📋</div>
              <p>No pending registrations</p>
            </div>
          ) : (
            db.registrations
              .filter(r => r.status === 'PENDING')
              .map(reg => (
                <div className="adm-reg-item" key={reg.id}>
                  <div className="adm-reg-avatar">
                    {reg.shop_name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div className="adm-reg-info">
                    <div className="adm-reg-name">{reg.shop_name}</div>
                    <div className="adm-reg-meta">
                      {reg.owner_name} • {reg.category || 'Restaurant'} • {reg.tables} tables • {formatDate(reg.created_at)}
                    </div>
                  </div>
                  <div className="adm-reg-actions">
                    <button className="adm-btn-approve" onClick={() => approveRegistration(reg.id)}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button className="adm-btn-reject" onClick={() => rejectRegistration(reg.id)}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <span className="adm-card-title">Top Shops</span>
            <span className="adm-card-sub">By Tables</span>
          </div>
          {topShops.length === 0 ? (
            <div className="adm-empty">
              <div className="adm-empty-icon">🏪</div>
              <p>No shops yet</p>
            </div>
          ) : (
            topShops.map((shop, idx) => (
              <div className="adm-top-shop" key={shop.id}>
                <div className="adm-top-shop-rank">{idx + 1}</div>
                <div className="adm-top-shop-name">{shop.name}</div>
                <div className="adm-top-shop-tables">{shop.tables || 0} tables</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="adm-toast">{toast}</div>}
    </div>
  );
};

export default AdminDashboard;
