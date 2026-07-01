import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Store, User, Phone, Mail, MapPin, Lock, Eye, EyeOff, Upload, ChevronDown } from 'lucide-react';
import { supabase, isMockMode } from '../lib/supabase';
import '../index.css';
import { useLanguage } from '../contexts/LanguageContext';

const SHOP_CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Bakery',
  'Hotel',
  'Food Truck',
  'Cloud Kitchen',
  'Sweet Shop',
  'Juice Bar',
  'Ice Cream Parlor',
  'Dhaba'
];

// Admin email whitelist
const ADMIN_EMAILS = [
  'sunnykiran715@gmail.com',
  'revanthrevanth4248@gmail.com'
];

const RegisterLogin = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration fields
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    mobile: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    category: '',
    tables: 5,
    logo: null
  });

  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userEmail = session.user.email?.toLowerCase();
        
        // Admin emails go straight to admin dashboard
        if (ADMIN_EMAILS.includes(userEmail)) {
          navigate('/admin/dashboard');
          return;
        }
        
        // Check if user has a registration pending
        if (isMockMode) {
          const db = JSON.parse(localStorage.getItem('supabase_mock_db') || '{}');
          const pendingReg = (db.registrations || []).find(
            r => r.email?.toLowerCase() === userEmail && r.status === 'PENDING'
          );
          if (pendingReg) {
            navigate('/pending-approval');
          } else {
            navigate('/dashboard');
          }
        } else {
          const { data: realReg } = await supabase.from('registrations')
            .select('status')
            .eq('email', userEmail)
            .eq('status', 'PENDING')
            .maybeSingle();
          if (realReg) {
            navigate('/pending-approval');
          } else {
            navigate('/dashboard');
          }
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFieldChange('logo', file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });
      if (error) throw error;

      const emailLower = loginEmail.toLowerCase();

      // Admin emails → admin dashboard
      if (ADMIN_EMAILS.includes(emailLower)) {
        navigate('/admin/dashboard');
        return;
      }

      // Check if user has a pending registration
      if (isMockMode) {
        const db = JSON.parse(localStorage.getItem('supabase_mock_db') || '{}');
        const pendingReg = (db.registrations || []).find(
          r => r.email?.toLowerCase() === emailLower && r.status === 'PENDING'
        );
        if (pendingReg) {
          navigate('/pending-approval');
        } else {
          navigate('/dashboard');
        }
      } else {
        const { data: realReg } = await supabase.from('registrations')
          .select('status')
          .eq('email', emailLower)
          .eq('status', 'PENDING')
          .maybeSingle();
        if (realReg) {
          navigate('/pending-approval');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validations
    if (!agreedTerms) {
      setError('Please agree to the Terms & Conditions.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.mobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!form.category) {
      setError('Please select a shop category.');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.ownerName } }
      });
      if (signUpError) throw signUpError;

      // 2. Add registration to DB
      if (isMockMode) {
        const db = JSON.parse(localStorage.getItem('supabase_mock_db') || '{}');
        if (!db.registrations) db.registrations = [];

        const newRegistration = {
          id: 'reg-' + Math.random().toString(36).substr(2, 9),
          shop_name: form.shopName,
          owner_name: form.ownerName,
          mobile: form.mobile,
          email: form.email.toLowerCase(),
          address: form.address,
          category: form.category,
          tables: parseInt(form.tables) || 5,
          logo_url: logoPreview || null,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          user_id: data?.user?.id || null
        };

        db.registrations.push(newRegistration);

        // Also add notification for admin
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: 'notif-' + Math.random().toString(36).substr(2, 9),
          shop_id: null,
          type: 'registration',
          title: 'New Shop Registration',
          message: `${form.shopName} by ${form.ownerName} — Awaiting approval`,
          created_at: new Date().toISOString(),
          read: false
        });

        localStorage.setItem('supabase_mock_db', JSON.stringify(db));

        // Broadcast change so admin.html picks it up
        localStorage.setItem('supabase_mock_broadcast', JSON.stringify({
          tableName: 'registrations',
          eventType: 'INSERT',
          newRecord: newRegistration,
          timestamp: Date.now()
        }));
      } else {
        const { error: insertError } = await supabase.from('registrations').insert([
          {
            shop_name: form.shopName,
            owner_name: form.ownerName,
            phone: form.mobile,
            mobile: form.mobile,
            email: form.email.toLowerCase(),
            address: form.address,
            category: form.category,
            tables: parseInt(form.tables) || 5,
            logo_url: logoPreview || null,
            status: 'PENDING',
            submitted_at: new Date().toISOString(),
            user_id: data?.user?.id || null
          }
        ]);
        if (insertError) throw insertError;
      }

      // 3. Navigate to pending approval page
      navigate('/pending-approval');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── LOGIN FORM ──────────────────────────────────────
  if (isLogin) {
    return (
      <main className="app-container" style={{ background: 'var(--color-bg)' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--color-accent), #C4541F)',
              width: '56px', height: '56px', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
              boxShadow: '0 8px 32px rgba(201, 149, 42, 0.3)'
            }}>
              <Store size={28} color="white" />
            </div>
            <h2 style={{ textAlign: 'center', margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.5rem' }}>Welcome Back</h2>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Sign in to manage your shop
            </p>
          </div>

          {error && <div style={{ background: 'rgba(255,0,0,0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>{error}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', opacity: 0.5 }} />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '0.95rem', transition: 'border-color 0.2s' }}
                  placeholder="owner@cafe.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', opacity: 0.5 }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 44px 12px 40px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '0.95rem' }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="login-submit-btn" type="submit" disabled={loading} className="btn-primary" style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '0.5rem',
              opacity: loading ? 0.7 : 1, padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: 600,
              letterSpacing: '0.05em', textTransform: 'uppercase'
            }}>
              {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '0.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
              <span style={{ padding: '0 12px', color: 'var(--color-text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            </div>

            <button id="google-login-btn" type="button" onClick={handleGoogleLogin} style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '12px',
              borderRadius: '12px', border: 'none', background: 'white', color: '#333', fontSize: '0.95rem',
              fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s'
            }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
               onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: '20px', height: '20px' }} />
              Sign in with Google
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              id="toggle-auth-mode-btn"
              onClick={() => { setIsLogin(false); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Don't have an account? <span style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Register Shop</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── REGISTRATION FORM (Based on Stitch Design) ──────
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Fixed Header */}
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '64px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              background: 'linear-gradient(135deg, var(--color-accent), #C4541F)',
              width: '36px', height: '36px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Store size={18} color="white" />
            </div>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--color-accent)' }}>QConnect</span>
          </div>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
              color: 'var(--color-text-main)', padding: '8px 20px', borderRadius: '10px',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--color-text-main)'; }}
          >
            Login
          </button>
        </div>
      </header>

      {/* Form Content */}
      <div style={{ maxWidth: '540px', width: '100%', padding: '88px 24px 60px' }}>
        {/* Page Heading */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
            fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1.3, marginBottom: '8px'
          }}>
            Register Your Shop & Get Started
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Join QConnect's digital ecosystem. Set up your menu, generate QR codes, and start receiving orders instantly.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
            padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
            fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>⚠</span> {error}
          </div>
        )}

        {/* Registration Card */}
        <form onSubmit={handleRegisterSubmit} style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          padding: 'clamp(20px, 4vw, 32px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
        }}>

          {/* ═══ SECTION: Shop Details ═══ */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700,
              color: 'var(--color-text-main)', paddingBottom: '10px', marginBottom: '20px',
              borderBottom: '1px solid var(--glass-border)'
            }}>Shop Details</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Shop Name */}
              <div>
                <label htmlFor="reg-shop-name" style={labelStyle}>Shop Name <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Store size={16} style={iconStyle} />
                  <input id="reg-shop-name" type="text" required value={form.shopName}
                    onChange={e => handleFieldChange('shopName', e.target.value)}
                    style={inputWithIconStyle} placeholder="e.g. Spice Garden Restaurant" />
                </div>
              </div>

              {/* Owner Name */}
              <div>
                <label htmlFor="reg-owner-name" style={labelStyle}>Owner Name <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={iconStyle} />
                  <input id="reg-owner-name" type="text" required value={form.ownerName}
                    onChange={e => handleFieldChange('ownerName', e.target.value)}
                    style={inputWithIconStyle} placeholder="Enter Owner Name" />
                </div>
              </div>

              {/* Shop Category */}
              <div>
                <label htmlFor="reg-category" style={labelStyle}>Shop Category <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <select id="reg-category" required value={form.category}
                    onChange={e => handleFieldChange('category', e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: 'none', cursor: 'pointer',
                      color: form.category ? 'var(--color-text-main)' : 'var(--color-text-muted)'
                    }}>
                    <option value="" disabled>Select Category</option>
                    {SHOP_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Number of Tables */}
              <div>
                <label htmlFor="reg-tables" style={labelStyle}>Number of Tables <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="reg-tables" type="number" min="1" max="500" required value={form.tables}
                  onChange={e => handleFieldChange('tables', e.target.value)}
                  style={inputStyle} placeholder="5" />
              </div>
            </div>
          </div>

          {/* ═══ SECTION: Contact Information ═══ */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700,
              color: 'var(--color-text-main)', paddingBottom: '10px', marginBottom: '20px',
              borderBottom: '1px solid var(--glass-border)'
            }}>Contact Information</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Mobile Number */}
              <div>
                <label htmlFor="reg-mobile" style={labelStyle}>Mobile Number <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    position: 'absolute', left: '14px', fontSize: '0.9rem',
                    color: 'var(--color-text-muted)', borderRight: '1px solid var(--glass-border)',
                    paddingRight: '10px', pointerEvents: 'none'
                  }}>+91</span>
                  <input id="reg-mobile" type="tel" required value={form.mobile}
                    onChange={e => handleFieldChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ ...inputStyle, paddingLeft: '60px' }}
                    placeholder="Enter 10-digit number" maxLength="10" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" style={labelStyle}>Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={iconStyle} />
                  <input id="reg-email" type="email" required value={form.email}
                    onChange={e => handleFieldChange('email', e.target.value)}
                    style={inputWithIconStyle} placeholder="owner@yourshop.com" />
                </div>
              </div>

              {/* Shop Address */}
              <div>
                <label htmlFor="reg-address" style={labelStyle}>Shop Address <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ ...iconStyle, top: '16px' }} />
                  <textarea id="reg-address" required value={form.address}
                    onChange={e => handleFieldChange('address', e.target.value)}
                    style={{
                      ...inputWithIconStyle, resize: 'none', minHeight: '80px',
                      paddingTop: '12px', fontFamily: 'inherit'
                    }}
                    placeholder="Enter complete shop address" rows="3" />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SECTION: Logo Upload (Optional) ═══ */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700,
              color: 'var(--color-text-main)', paddingBottom: '10px', marginBottom: '20px',
              borderBottom: '1px solid var(--glass-border)'
            }}>Shop Logo <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>(Optional)</span></h2>

            <label htmlFor="reg-logo" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed var(--glass-border)', borderRadius: '14px',
              padding: '24px', cursor: 'pointer', transition: 'all 0.2s',
              background: 'rgba(201, 149, 42, 0.03)',
              minHeight: '120px'
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" style={{
                  width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover',
                  border: '2px solid var(--color-accent)'
                }} />
              ) : (
                <>
                  <Upload size={28} color="var(--color-text-muted)" style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Click to upload shop logo</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', opacity: 0.6, marginTop: '4px' }}>PNG, JPG up to 2MB</span>
                </>
              )}
              <input id="reg-logo" type="file" accept="image/*" onChange={handleLogoUpload}
                style={{ display: 'none' }} />
            </label>
          </div>

          {/* ═══ SECTION: Security ═══ */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700,
              color: 'var(--color-text-main)', paddingBottom: '10px', marginBottom: '20px',
              borderBottom: '1px solid var(--glass-border)'
            }}>Security</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
              {/* Password */}
              <div>
                <label htmlFor="reg-password" style={labelStyle}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={iconStyle} />
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} required
                    value={form.password} onChange={e => handleFieldChange('password', e.target.value)}
                    style={{ ...inputWithIconStyle, paddingRight: '44px' }} placeholder="Min 6 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={eyeBtnStyle}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm-password" style={labelStyle}>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={iconStyle} />
                  <input id="reg-confirm-password" type={showConfirmPassword ? 'text' : 'password'} required
                    value={form.confirmPassword} onChange={e => handleFieldChange('confirmPassword', e.target.value)}
                    style={{ ...inputWithIconStyle, paddingRight: '44px' }} placeholder="Re-enter password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={eyeBtnStyle}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Terms & Conditions ═══ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px' }}>
            <input
              id="reg-terms"
              type="checkbox"
              checked={agreedTerms}
              onChange={e => setAgreedTerms(e.target.checked)}
              style={{
                marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--color-accent)',
                cursor: 'pointer', flexShrink: 0
              }}
            />
            <label htmlFor="reg-terms" style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
              I agree to the <Link to="/terms" style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Terms & Conditions</Link> and <Link to="/privacy" style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Privacy Policy</Link> regarding data handling.
            </label>
          </div>

          {/* ═══ Submit Button ═══ */}
          <button id="register-submit-btn" type="submit" disabled={loading} className="btn-primary" style={{
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            padding: '15px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s'
          }}>
            {loading ? (
              <>
                <span style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                Processing...
              </>
            ) : (
              <>Register Shop <ArrowRight size={18} /></>
            )}
          </button>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '28px', paddingBottom: '24px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              style={{
                background: 'none', border: 'none', color: 'var(--color-accent)',
                fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                textUnderlineOffset: '3px', fontSize: '0.9rem'
              }}
            >Login</button>
          </p>
        </div>
      </div>
    </main>
  );
};

// ─── Shared Inline Styles ──────────────────────────────
const labelStyle = {
  display: 'block', marginBottom: '6px', fontSize: '0.78rem',
  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--color-text-muted)'
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid var(--glass-border)', background: 'var(--color-bg)',
  color: 'var(--color-text-main)', outline: 'none', fontSize: '0.95rem',
  transition: 'border-color 0.2s, box-shadow 0.2s'
};

const iconStyle = {
  position: 'absolute', left: '14px', top: '50%',
  transform: 'translateY(-50%)', color: 'var(--color-text-muted)', opacity: 0.5,
  pointerEvents: 'none'
};

const inputWithIconStyle = {
  ...inputStyle,
  paddingLeft: '40px'
};

const eyeBtnStyle = {
  position: 'absolute', right: '12px', top: '50%',
  transform: 'translateY(-50%)', background: 'none', border: 'none',
  color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px'
};

export default RegisterLogin;
