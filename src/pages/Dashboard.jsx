import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, Plus, Edit2, MessageSquare, ChevronRight, ClipboardList } from 'lucide-react';
import '../dashboard.css';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { shop, orders, menuViews } = useOutletContext();
  const [feedbacks, setFeedbacks] = useState([]);
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [todaysOrders, setTodaysOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevOrdersCountRef = useRef(orders.length);
  const { t } = useLanguage();

  // Calculate stats dynamically from the active orders in context
  const pendingOrdersCount = orders.length;
  const uniqueActiveTables = new Set(orders.map(o => o.table_number).filter(Boolean)).size;
  const totalTables = shop?.tables || 12;
  const activeTablesPercentage = totalTables > 0 
    ? Math.round((uniqueActiveTables / totalTables) * 100)
    : 0;

  useEffect(() => {
    if (!shop?.id) return;
    let active = true;
    
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch recent feedbacks (last 5)
        const { data: fbs } = await supabase.from('feedback')
          .select('*')
          .eq('shop_id', shop.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (active && fbs) setFeedbacks(fbs);

        const getOperatingDayStart = () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 12, 0, 0);
          if (now < start) {
            start.setDate(start.getDate() - 1);
          }
          return start;
        };
        const startOfToday = getOperatingDayStart();
        const { data: deliveredToday } = await supabase.from('orders')
          .select('total_amount')
          .eq('shop_id', shop.id)
          .eq('status', 'delivered')
          .gte('created_at', startOfToday.toISOString());
        
        if (active && deliveredToday) {
          const revenue = deliveredToday.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          setTodaysRevenue(revenue);
          setTodaysOrders(deliveredToday.length);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      active = false;
    };
  }, [shop?.id]);

  // Sync today's statistics when an active order is delivered/rejected (indicated by orders count decreasing)
  useEffect(() => {
    if (!shop?.id) return;
    
    const prevOrdersCount = prevOrdersCountRef.current;
    
    // Always fetch initial stats once on mount
    let isInitialMount = prevOrdersCount === orders.length;

    // Only sync if it's the initial fetch, or if the active orders count decreased (indicating delivery/rejection)
    if (!isInitialMount && orders.length >= prevOrdersCount) {
      prevOrdersCountRef.current = orders.length;
      return;
    }

    let active = true;

    const syncStats = async () => {
      try {
        const getOperatingDayStart = () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 12, 0, 0);
          if (now < start) {
            start.setDate(start.getDate() - 1);
          }
          return start;
        };
        const startOfToday = getOperatingDayStart();

        const { data: deliveredToday } = await supabase.from('orders')
          .select('total_amount')
          .eq('shop_id', shop.id)
          .eq('status', 'delivered')
          .gte('created_at', startOfToday.toISOString());
        
        if (active && deliveredToday) {
          const revenue = deliveredToday.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          setTodaysRevenue(revenue);
          setTodaysOrders(deliveredToday.length);
        }
      } catch (err) {
        console.error('Error syncing stats:', err);
      }
    };

    syncStats();
    prevOrdersCountRef.current = orders.length;

    return () => {
      active = false;
    };
  }, [orders, shop?.id]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}>Loading dashboard stats...</div>;
  }

  // Format currency for desktop / tablet
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const strftime = (dateStr) => {
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

  return (
    <div className="dashboard-content-wrapper">
      {/* Welcome Section */}
      <section className="dash-welcome-section">
        <h2 className="dash-welcome-text">{t.welcomeBack} {shop?.owner_name || t.owner}! 👋</h2>
        <div className="dash-status-badge" style={shop?.holiday_mode ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' } : {}}>
          <span className="dash-status-dot" style={shop?.holiday_mode ? { backgroundColor: '#ef4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' } : {}}></span>
          {shop?.holiday_mode ? t.restaurantStatusClosed : t.restaurantStatusOpen}
        </div>
      </section>

      {/* Key Metrics Row (4 columns on desktop) */}
      <section className="dash-metrics-container">
        {/* Today's Revenue */}
        <div className="dash-stat-card">
          <p className="dash-stat-label">{t.todaysRevenue}</p>
          <h3 className="dash-stat-value">{formatCurrency(todaysRevenue)}</h3>
        </div>
        
        {/* Today's Orders */}
        <div className="dash-stat-card">
          <p className="dash-stat-label">{t.totalOrders}</p>
          <h3 className="dash-stat-value">{todaysOrders}</h3>
        </div>
        
        {/* Menu Views */}
        <div className="dash-stat-card">
          <p className="dash-stat-label">{t.menuViews}</p>
          <h3 className="dash-stat-value">{menuViews}</h3>
        </div>

        {/* Total Tables */}
        <div className="dash-stat-card">
          <p className="dash-stat-label">Total Tables</p>
          <h3 className="dash-stat-value">{shop?.tables || 12}</h3>
        </div>
      </section>

      {/* Live Status Section */}
      <section className="dash-live-section">
        <h3 className="dash-section-title">{t.liveStatus}</h3>
        <div className="dash-live-grid">
          {/* Active Tables progress circle chart */}
          <div className="dash-live-card active-tables-card">
            <div className="radial-chart-container">
              <svg width="72" height="72" viewBox="0 0 72 72" className="radial-svg">
                <circle cx="36" cy="36" r="30" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                <circle 
                  cx="36" 
                  cy="36" 
                  r="30" 
                  fill="transparent" 
                  stroke="var(--color-accent)" 
                  strokeWidth="6" 
                  strokeDasharray="188.4" 
                  strokeDashoffset={188.4 - (188.4 * activeTablesPercentage) / 100} 
                  strokeLinecap="round"
                />
              </svg>
              <div className="radial-chart-text">
                {activeTablesPercentage}%
              </div>
            </div>
            <p className="dash-stat-label">Active Tables</p>
          </div>
          
          {/* Pending Orders info */}
          <div className="dash-live-card pending-orders-card" onClick={() => navigate('/orders')}>
            <div className="pending-orders-icon-wrapper">
              <ClipboardList size={22} />
            </div>
            <p className="dash-stat-label">{t.pendingOrders}</p>
            <h3 className="pending-orders-status-text">
              {pendingOrdersCount === 0 ? 'No Orders Yet' : `${pendingOrdersCount} Active`}
            </h3>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="dash-quick-actions-section">
        <h3 className="dash-section-title">{t.quickActions}</h3>
        <div className="dash-quick-actions-grid">
          <button className="dash-quick-action-btn" onClick={() => navigate('/menu-builder')}>
            <div className="dash-quick-action-icon">
              <Plus size={22} />
            </div>
            <span className="dash-quick-action-label">{t.addItem}</span>
          </button>
          <button className="dash-quick-action-btn" onClick={() => navigate('/menu-builder')}>
            <div className="dash-quick-action-icon">
              <Edit2 size={20} />
            </div>
            <span className="dash-quick-action-label">{t.editMenu}</span>
          </button>
          <button className="dash-quick-action-btn" onClick={() => window.open(`/menu/${shop?.owner_unique_id}`, '_blank')}>
            <div className="dash-quick-action-icon">
              <Eye size={22} />
            </div>
            <span className="dash-quick-action-label">{t.viewMenu}</span>
          </button>
        </div>
      </section>

      {/* Recent Feedback List */}
      <section className="dash-feedback-section">
        <div className="dash-feedback-header">
          <h3 className="dash-section-title" style={{ margin: 0 }}>{t.recentFeedbacks}</h3>
          <button className="dash-feedback-history-link" onClick={() => navigate('/feedback')}>{t.history}</button>
        </div>
        
        <div className="dash-feedback-list">
          {feedbacks.length === 0 ? (
            <p className="dash-feedback-empty-text">
              {t.noFeedback}
            </p>
          ) : (
            feedbacks.map((fb) => (
              <div key={fb.id} className="dash-activity-item" onClick={() => navigate('/feedback')}>
                <div className="dash-activity-icon" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
                  <MessageSquare size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <p style={{ margin: 0, fontWeight: '500', fontSize: '0.95rem' }}>"{fb.message || 'No comment.'}"</p>
                    {fb.rating && (
                      <span style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', color: '#FFC107', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {fb.rating} ★
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Table {fb.table_number || '?'} • {strftime(fb.created_at)}
                  </p>
                </div>
                <ChevronRight size={20} color="var(--color-text-muted)" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
