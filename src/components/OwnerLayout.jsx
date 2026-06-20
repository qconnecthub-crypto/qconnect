import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutGrid, 
  Utensils, 
  QrCode, 
  MessageSquare, 
  History, 
  Settings, 
  Bell, 
  Coffee,
  FileText,
  ClipboardList,
  X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './OwnerLayout.css';

const OwnerLayout = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shop, setShop] = useState(null);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [menuViews, setMenuViews] = useState(0);
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const { lang, setLang, t } = useLanguage();

  // Auto-dismiss toast notification after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const getActiveTab = () => {
    if (activeTab) return activeTab;
    const path = location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('menu-builder')) return 'menu';
    if (path.includes('qr-code')) return 'qr-code';
    if (path.includes('orders')) return 'orders';
    if (path.includes('feedback')) return 'feedback';
    if (path.includes('history')) return 'history';
    if (path.includes('settings')) return 'settings';
    return 'dashboard';
  };

  const currentTab = getActiveTab();

  useEffect(() => {
    const tabTitles = {
      dashboard: t.dashboard || 'Dashboard',
      menu: t.menu || 'Menu Builder',
      'qr-code': t.qrCodes || 'QR Codes',
      orders: t.orders || 'Kitchen Orders',
      feedback: t.feedback || 'Customer Feedbacks',
      history: t.history || 'Order History',
      settings: t.settings || 'Settings'
    };
    
    const pageName = tabTitles[currentTab] || 'Dashboard';
    const shopName = shop?.name || 'Smart Cafe';
    const originalTitle = document.title;
    
    document.title = `${pageName} | ${shopName} - QConnect`;
    
    return () => {
      document.title = originalTitle;
    };
  }, [currentTab, shop?.name, t]);

  // Navigation Items for Desktop Sidebar
  const sidebarItems = [
    { id: 'dashboard', label: t.dashboard, path: '/dashboard', icon: LayoutGrid },
    { id: 'menu', label: t.menu, path: '/menu-builder', icon: Utensils },
    { id: 'qr-code', label: t.qrCodes, path: '/qr-code', icon: QrCode },
    { id: 'orders', label: t.orders, path: '/orders', icon: ClipboardList },
    { id: 'feedback', label: t.feedback, path: '/feedback', icon: MessageSquare },
    { id: 'history', label: t.history, path: '/history', icon: History },
    { id: 'settings', label: t.settings, path: '/settings', icon: Settings }
  ];

  useEffect(() => {
    let isMounted = true;
    let channel;

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;
        if (!isMounted) return;
        if (!authUser) {
          navigate('/register');
          return;
        }
        setUser(authUser);

        // Fetch shop details
        const { data: shops } = await supabase.from('shops').select('*').eq('user_id', authUser.id).limit(1);
        if (!isMounted) return;
        if (shops && shops.length > 0) {
          const s = shops[0];
          setShop(s);

          // Fetch notifications
          const { data: notifs } = await supabase.from('notifications')
            .select('*')
            .eq('shop_id', s.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(20);
          if (!isMounted) return;
          if (notifs) setNotifications(notifs);

          // Fetch active orders (pending, preparing, ready)
          const { data: activeOrders } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('shop_id', s.id)
            .neq('status', 'rejected')
            .neq('status', 'delivered')
            .order('created_at', { ascending: false });
          if (!isMounted) return;
          if (activeOrders) setOrders(activeOrders);

          const getOperatingDayStart = () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 12, 0, 0);
            if (now < start) {
              start.setDate(start.getDate() - 1);
            }
            return start;
          };
          const startOfToday = getOperatingDayStart();

          // Fetch initial menu views
          const { count: viewsCount } = await supabase.from('menu_views')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', s.id)
            .gte('created_at', startOfToday.toISOString());
          if (!isMounted) return;
          if (viewsCount !== null) setMenuViews(viewsCount);

          // Subscribe to combined realtime updates (notifications, views, orders) with unique channel name
          channel = supabase.channel(`realtime-owner-${s.id}-${Date.now()}`)
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `shop_id=eq.${s.id}`
            }, (payload) => {
              setNotifications(prev => [payload.new, ...prev].slice(0, 20));
              setActiveToast(payload.new);
            })
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'menu_views',
              filter: `shop_id=eq.${s.id}`
            }, () => {
              setMenuViews(prev => prev + 1);
            })
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `shop_id=eq.${s.id}`
            }, async (payload) => {
              if (payload.eventType === 'INSERT') {
                // Small delay to ensure order_items have been inserted by the client
                setTimeout(async () => {
                  const { data: newOrder } = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('id', payload.new.id)
                    .single();
                  if (newOrder) {
                    setOrders(prev => {
                      // Prevent duplicates
                      if (prev.some(o => o.id === newOrder.id)) return prev;
                      return [newOrder, ...prev];
                    });
                    setShowNewOrderAlert(true);
                    setTimeout(() => setShowNewOrderAlert(false), 5000);
                  }
                }, 1500);
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new;
                if (updated.status === 'rejected' || updated.status === 'delivered') {
                  setOrders(prev => prev.filter(o => o.id !== updated.id));
                } else {
                  setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
                }
              } else if (payload.eventType === 'DELETE') {
                setOrders(prev => prev.filter(o => o.id !== payload.old.id));
              }
            })
            .subscribe();
        } else {
          // If shop is not setup yet
          navigate('/shop-setup');
        }
      } catch (err) {
        console.error('Error fetching layout data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const getTimeUntilNextCutoff = () => {
      const now = new Date();
      const nextCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 12, 0, 0);
      if (now >= nextCutoff) {
        nextCutoff.setDate(nextCutoff.getDate() + 1);
      }
      return nextCutoff.getTime() - now.getTime();
    };

    let timer;
    const scheduleReset = () => {
      const ms = getTimeUntilNextCutoff();
      timer = setTimeout(() => {
        fetchData();
        scheduleReset();
      }, ms);
    };
    scheduleReset();

    fetchData();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearTimeout(timer);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-surface)', borderTop: '4px solid var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    }
    // Clear notifications list in UI
    setNotifications([]);
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    }
    // Remove clicked notification from the active list
    setNotifications(prev => prev.filter(notif => notif.id !== n.id));
    
    // Navigate if notification contains details
    if (n.type === 'feedback') {
      navigate('/feedback');
    } else if (n.type === 'order' || n.type === 'waiter') {
      navigate('/orders');
    }
  };

  // Tab resolution logic moved to top of component to satisfy React Hook rules

  return (
    <div className="owner-layout">
      {/* 1. Left Sidebar - Desktop/Tablet */}
      <aside className="owner-sidebar">
        <div className="sidebar-logo-container">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
            {/* Gradient definition for Q Connect logo mark */}
            <defs>
              <linearGradient id="q-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
            </defs>
            {/* Outer Q ring ending in a fork shape */}
            <path 
              d="M 68 62 C 75 53 74 38 64 30 C 53 21 38 23 30 33 C 21 44 23 59 33 67 C 42 74 54 74 62 67 C 63 66 65 65 66 66 L 76 76" 
              stroke="url(#q-logo-grad)" 
              strokeWidth="6.5" 
              strokeLinecap="round" 
              fill="none" 
            />
            {/* Fork prongs */}
            <path 
              d="M 73 73 L 70 76 M 75 75 L 72 78 M 77 77 L 74 80 M 76 76 L 81 81" 
              stroke="url(#q-logo-grad)" 
              strokeWidth="5" 
              strokeLinecap="round" 
            />
            {/* Abstract QR code */}
            <rect x="36" y="37" width="9" height="9" stroke="#0f172a" strokeWidth="1.8" fill="none"/>
            <rect x="39" y="40" width="3" height="3" fill="#0f172a"/>
            <rect x="36" y="51" width="9" height="9" stroke="#0f172a" strokeWidth="1.8" fill="none"/>
            <rect x="39" y="54" width="3" height="3" fill="#0f172a"/>
            <rect x="50" y="37" width="9" height="9" stroke="#0f172a" strokeWidth="1.8" fill="none"/>
            <rect x="53" y="40" width="3" height="3" fill="#0f172a"/>
            <rect x="49" y="51" width="3" height="3" fill="#0f172a"/>
            <rect x="54" y="56" width="3" height="3" fill="#0f172a"/>
            {/* Wifi/Signal Waves */}
            <path d="M 64 42 A 12 12 0 0 1 64 54" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M 68 39 A 17 17 0 0 1 68 57" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="sidebar-logo-text">Q Connect</span>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${currentTab === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                aria-label={`Navigate to ${item.label}`}
              >
                <Icon className="sidebar-icon" size={20} aria-hidden="true" />
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 2. Right Container */}
      <div className="owner-main-container">
        {/* Top bar header */}
        <header className="owner-top-header">
          {/* Left part of top bar */}
          <div className="top-header-left">
            {/* Mobile View: Back arrow & logo */}
            <div className="mobile-header-info">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="Shop Logo" className="mobile-shop-logo" loading="lazy" />
              ) : (
                <div className="mobile-shop-logo fallback">
                  <Coffee size={20} aria-hidden="true" />
                </div>
              )}
            </div>
            
            {/* Cafe Title (Text-only on desktop, matches PNG) */}
            <h1 className="top-header-title">{shop?.name || 'PSRV Cafe'}</h1>
          </div>

          {/* Right part of top bar */}
          <div className="top-header-right">
            {/* Language Toggle switch */}
            <button className="language-toggle-pill" onClick={() => setLang(lang === 'EN' ? 'TE' : 'EN')} aria-label={`Switch language to ${lang === 'EN' ? 'Telugu' : 'English'}`}>
              <span className={`lang-option ${lang === 'TE' ? 'active' : ''}`}>TE</span>
              <span className={`lang-option ${lang === 'EN' ? 'active' : ''}`}>EN</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="top-notification-wrapper">
              <button className="top-notification-btn" onClick={() => setIsNotifOpen(!isNotifOpen)} aria-label="Toggle notifications">
                <Bell size={22} aria-hidden="true" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="top-notification-dot"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="top-notification-dropdown">
                  <div className="top-notification-header">
                    <h3>{t.notifications}</h3>
                    <button onClick={handleMarkAllRead} className="mark-read-btn">
                      {t.markAllRead}
                    </button>
                  </div>
                  
                  <div className="top-notification-list">
                    {notifications.length === 0 ? (
                      <div className="top-notification-empty">{t.noNotifications}</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`top-notification-item ${n.is_read ? '' : 'unread'}`}
                          onClick={() => {
                            handleNotificationClick(n);
                            setIsNotifOpen(false);
                          }}
                        >
                          <div className="top-notification-icon-wrapper" style={{ 
                            backgroundColor: n.type === 'feedback' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 109, 0, 0.1)', 
                            color: n.type === 'feedback' ? '#4CAF50' : '#ff6b35' 
                          }}>
                            {n.type === 'feedback' ? <MessageSquare size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
                          </div>
                          <div className="top-notification-content">
                            <p className="top-notification-title">{n.title}</p>
                            <p className="top-notification-message">{n.message}</p>
                            <p className="top-notification-time">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Inner Content */}
        <main className="owner-page-content">
          <Outlet context={{ 
            shop, 
            setShop, 
            user, 
            orders, 
            setOrders, 
            menuViews, 
            setMenuViews, 
            showNewOrderAlert, 
            setShowNewOrderAlert 
          }} />
        </main>
      </div>

      {/* 3. Bottom Navigation - Mobile View only (preserves current structure) */}
      <nav className="dash-bottom-nav" aria-label="Mobile navigation">
        <button className={`dash-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')} aria-label="Dashboard">
          <LayoutGrid size={24} aria-hidden="true" />
          <span className="dash-nav-label">{t.dashboard}</span>
        </button>
        <button className={`dash-nav-item ${currentTab === 'menu' ? 'active' : ''}`} onClick={() => navigate('/menu-builder')} aria-label="Menu Builder">
          <Utensils size={24} aria-hidden="true" />
          <span className="dash-nav-label">{t.menu}</span>
        </button>
        <button className={`dash-nav-item ${currentTab === 'qr-code' ? 'active' : ''}`} onClick={() => navigate('/qr-code')} style={{ position: 'relative', top: '-10px', backgroundColor: 'var(--color-bg)', padding: '8px', borderRadius: '50%', color: 'var(--color-accent)', border: '2px solid var(--color-surface)' }} aria-label="QR Codes">
          <QrCode size={28} aria-hidden="true" />
        </button>
        <button className={`dash-nav-item ${currentTab === 'history' ? 'active' : ''}`} onClick={() => navigate('/history')} aria-label="Bill History">
          <FileText size={24} aria-hidden="true" />
          <span className="dash-nav-label">{t.history}</span>
        </button>
        <button className={`dash-nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => navigate('/settings')} aria-label="Settings">
          <Settings size={24} aria-hidden="true" />
          <span className="dash-nav-label">{t.settings}</span>
        </button>
      </nav>

      {/* Real-Time Toast Notification Popup */}
      {activeToast && (
        <div className="owner-toast-container">
          <div 
            className="owner-toast-card" 
            onClick={() => {
              if (activeToast.type === 'feedback') {
                navigate('/feedback');
              } else if (activeToast.type === 'waiter' || activeToast.type === 'order') {
                navigate('/orders');
              }
              setActiveToast(null);
            }}
          >
            <div className="owner-toast-icon-wrapper">
              {activeToast.type === 'feedback' ? <MessageSquare size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}
            </div>
            <div className="owner-toast-content">
              <h4 className="owner-toast-title">{activeToast.title}</h4>
              <p className="owner-toast-message">{activeToast.message}</p>
            </div>
            <button 
              className="owner-toast-close-btn" 
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              aria-label="Close notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerLayout;
