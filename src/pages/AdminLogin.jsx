import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import '../admin-dashboard.css';

// Whitelisted admin emails
const ADMIN_EMAILS = [
  'sunnykiran715@gmail.com',
  'revanthrevanth4248@gmail.com'
];

// Whitelisted admin pins
const VALID_PINS = [
  import.meta.env.VITE_ADMIN_PIN,
  '91009674',
  '12345678'
].filter(Boolean);

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState(Array(8).fill(''));
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (ADMIN_EMAILS.includes(session.user.email?.toLowerCase())) {
          const pinVerified = sessionStorage.getItem('admin_pin_verified') === 'true';
          if (pinVerified) {
            navigate('/admin/dashboard');
          } else {
            setShowPinEntry(true);
          }
        } else {
          setError('Access denied. This area is restricted to authorized developers only.');
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/admin' }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if email is whitelisted before even trying to login
      if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
        throw new Error('Access denied. This area is restricted to authorized developers only.');
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      setShowPinEntry(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError('');
    setLoading(true);
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('admin_pin_verified');
      setShowPinEntry(false);
      setPin(Array(8).fill(''));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (target, index) => {
    const val = target.value;
    if (isNaN(val)) return;

    const newPin = [...pin];
    newPin[index] = val.substring(val.length - 1);
    setPin(newPin);

    if (val) {
      const nextInput = document.getElementById(`pin-box-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newPin = [...pin];
      if (pin[index] === '') {
        const prevInput = document.getElementById(`pin-box-${index - 1}`);
        if (prevInput) {
          prevInput.focus();
          newPin[index - 1] = '';
          setPin(newPin);
        }
      } else {
        newPin[index] = '';
        setPin(newPin);
      }
    }
  };

  const handlePinPaste = (e) => {
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{8}$/.test(pastedData)) return;

    const digits = pastedData.split('');
    setPin(digits);

    const lastInput = document.getElementById('pin-box-7');
    if (lastInput) lastInput.focus();
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    setError('');

    const pinString = pin.join('');
    if (pinString.length !== 8) {
      setError('Please enter a complete 8-digit security PIN.');
      return;
    }

    if (VALID_PINS.includes(pinString)) {
      sessionStorage.setItem('admin_pin_verified', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Incorrect security PIN. Please try again.');
      setPin(Array(8).fill(''));
      const firstInput = document.getElementById('pin-box-0');
      if (firstInput) firstInput.focus();
    }
  };

  if (showPinEntry) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-badge">
            <Shield size={14} />
            Verification Required
          </div>

          <h1 className="admin-login-title">Security PIN</h1>
          <p className="admin-login-subtitle">Enter your 8-digit security PIN to access the admin panel</p>

          {error && <div className="admin-login-error">{error}</div>}

          <form onSubmit={handlePinSubmit}>
            <div className="admin-pin-inputs-container" onPaste={handlePinPaste}>
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pin-box-${idx}`}
                  type="text"
                  maxLength="1"
                  className="admin-pin-input-box"
                  value={digit}
                  onChange={e => handlePinChange(e.target, idx)}
                  onKeyDown={e => handlePinKeyDown(e, idx)}
                  autoComplete="off"
                  inputMode="numeric"
                />
              ))}
            </div>

            <button type="submit" className="admin-login-btn" style={{ marginTop: '1.5rem' }} disabled={loading}>
              Verify PIN <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button className="admin-login-back" style={{ marginTop: 0 }} onClick={handleSignOut} disabled={loading}>
              Sign Out
            </button>
            <button className="admin-login-back" style={{ marginTop: 0 }} onClick={() => navigate('/')} disabled={loading}>
              <ArrowLeft size={14} /> Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-badge">
          <Shield size={14} />
          Developer Access
        </div>

        <h1 className="admin-login-title">Admin Panel</h1>
        <p className="admin-login-subtitle">Sign in with your authorized developer account</p>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="admin-login-field">
            <label className="admin-login-label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              className="admin-login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="developer@gmail.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="admin-login-field">
            <label className="admin-login-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="admin-login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
          <span style={{ padding: '0 10px', color: '#64748b', fontSize: '0.8rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="admin-google-btn"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: '18px', height: '18px' }} />
          Sign in with Google
        </button>

        <button className="admin-login-back" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Website
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
