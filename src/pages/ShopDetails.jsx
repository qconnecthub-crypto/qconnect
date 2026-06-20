import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Upload, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../index.css';
import { useLanguage } from '../contexts/LanguageContext';

const ShopDetails = () => {
  const navigate = useNavigate();
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [tables, setTables] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        navigate('/register');
        return;
      }
      
      setUserId(user.id);
      
      if (user.email) {
        setEmail(user.email);
      }
      
      // Clean up the OAuth access_token from the URL hash for security and to resolve browser warnings
      if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      // Check if shop already exists
      const { data: shops } = await supabase.from('shops').select('id').eq('user_id', user.id).limit(1);
      if (shops && shops.length > 0) {
        navigate('/dashboard');
        return;
      }

      // Pre-fill owner name if available from Google Auth metadata
      if (user.user_metadata?.full_name) {
        setOwnerName(user.user_metadata.full_name);
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
        return;
      }
      // Validate file size (max 2MB = 2 * 1024 * 1024 bytes)
      if (file.size > 2 * 1024 * 1024) {
        setError('File is too large. Maximum size allowed is 2MB.');
        return;
      }

      setError('');
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    
    setLoading(true);
    setError('');

    try {
      // 1. Upload logo to Supabase Storage if a file was selected
      let finalLogoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop() || 'png';
        const fileName = `${userId}/logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('shop-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);
        
        const { data: { publicUrl } } = supabase.storage
          .from('shop-logos')
          .getPublicUrl(fileName);
          
        finalLogoUrl = publicUrl;
      }

      // 2. Generate a collision-free unique owner ID based on shop name
      const prefix = shopName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'SHP');
      let ownerUniqueId = '';
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        attempts++;
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        ownerUniqueId = `${prefix}-${randomNum}`;
        
        const { data: existingShop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_unique_id', ownerUniqueId)
          .maybeSingle();
          
        if (!existingShop) {
          isUnique = true;
        }
      }
      
      if (!isUnique) {
        throw new Error('Failed to generate a unique shop ID. Please try again.');
      }

      const { error } = await supabase.from('shops').insert([
        { 
          user_id: userId,
          name: shopName,
          owner_name: ownerName,
          mobile: mobile,
          address: address,
          tables: parseInt(tables, 10),
          logo_url: finalLogoUrl,
          owner_unique_id: ownerUniqueId,
          email: email,
          is_approved: false
        }
      ]);

      if (error) {
        if (error.code === '23503' || error.message?.toLowerCase().includes('foreign key')) {
          await supabase.auth.signOut();
          throw new Error('Your session is invalid (likely because your user account was deleted from the database). You have been signed out. Please register again.');
        }
        throw error;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container" style={{ padding: '3rem 2rem' }}>
      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        <button 
          id="back-btn"
          aria-label="Go back"
          onClick={() => navigate(-1)} 
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', color: 'var(--color-text-main)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '2rem', width: '42px', height: '42px', transition: 'var(--transition-fast)' }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--color-primary)', padding: '12px', borderRadius: '12px' }}>
            <Store size={28} color="var(--color-accent)" />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{t.shopDetails}</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t.shopDetailsSub}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px' }}>
          {error && <div style={{ background: 'rgba(255,0,0,0.1)', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Logo Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', border: '2px dashed var(--glass-border)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)' }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '50%' }}>
                  <Upload size={32} color="var(--color-text-muted)" />
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <label htmlFor="logo-upload-input" style={{ cursor: 'pointer', color: 'var(--color-accent)', fontWeight: '600' }}>
                  Click to upload logo
                </label>
                <input id="logo-upload-input" type="file" style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Optional, but recommended</p>
              </div>
            </div>

            <div>
              <label htmlFor="shop-name-input" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: '500' }}>{t.shopName}</label>
              <input 
                id="shop-name-input"
                type="text" 
                required 
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '1rem' }} 
                placeholder={t.shopNamePlaceholder}
              />
            </div>

            <div>
              <label htmlFor="owner-name-input" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: '500' }}>{t.ownerName}</label>
              <input 
                id="owner-name-input"
                type="text" 
                required 
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '1rem' }} 
                placeholder={t.ownerNamePlaceholder}
              />
            </div>

            <div>
              <label htmlFor="email-display" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: '500' }}>Email Address</label>
              <input 
                id="email-display"
                type="email" 
                disabled 
                value={email}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', outline: 'none', fontSize: '1rem', cursor: 'not-allowed' }} 
              />
            </div>

            <div>
              <label htmlFor="mobile-input" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: '500' }}>{t.contactNumber}</label>
              <input 
                id="mobile-input"
                type="tel" 
                required 
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '1rem' }} 
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div>
              <label htmlFor="address-input" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: '500' }}>
                {t.address} ({t.optional})
              </label>
              <textarea 
                id="address-input"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '1rem', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} 
                placeholder={t.addressPlaceholder}
              />
            </div>

            <div>
              <label htmlFor="tables-count-input" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: '500' }}>Number of Tables</label>
              <input 
                id="tables-count-input"
                type="number" 
                min="1"
                required 
                value={tables}
                onChange={e => setTables(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', outline: 'none', fontSize: '1rem' }} 
                placeholder="e.g. 15" 
              />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>This helps us generate the right amount of QR codes later.</p>
            </div>

            <button id="shop-submit-btn" type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '1rem', padding: '16px', opacity: loading ? 0.7 : 1 }}>
              <CheckCircle size={20} /> {loading ? t.saving : t.saveDetails}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ShopDetails;
