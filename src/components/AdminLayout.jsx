import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutGrid, 
  Users, 
  Shield, 
  Store,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import '../admin-dashboard.css';

// Whitelisted admin emails
const ADMIN_EMAILS = [
  'sunnykiran715@gmail.com',
  'revanthrevanth4248@gmail.com'
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/owners')) return 'owners';
    return 'dashboard';
  };

  const currentTab = getActiveTab();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;

        if (!authUser || !ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
          navigate('/admin');
          return;
        }

        const pinVerified = sessionStorage.getItem('admin_pin_verified') === 'true';
        if (!pinVerified) {
          navigate('/admin');
          return;
        }

        setUser(authUser);
      } catch (err) {
        console.error('Admin auth check failed:', err);
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.05)', borderTop: '4px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutGrid },
    { id: 'owners', label: 'Shop Owners', path: '/admin/owners', icon: Users },
    { id: 'owner-panel', label: 'Owner Panel', path: '/dashboard', icon: Store }
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar - Desktop */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-icon">
            <Shield size={20} />
          </div>
          <div>
            <div className="admin-sidebar-logo-text">Q Connect</div>
            <div className="admin-sidebar-logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`admin-nav-item ${currentTab === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e2e8f0' }}>Developer</div>
              <div className="admin-sidebar-email">{user?.email}</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <h2 className="admin-topbar-title">
            {currentTab === 'dashboard' ? 'Admin Dashboard' : 'Shop Owners'}
          </h2>
        </header>

        <main className="admin-page-content">
          <Outlet context={{ user }} />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="admin-mobile-nav">
        {sidebarItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`admin-mobile-nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className="admin-mobile-nav-item" onClick={handleLogout}>
          <LogOut size={22} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminLayout;
