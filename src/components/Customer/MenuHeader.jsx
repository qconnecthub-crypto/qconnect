import React from 'react';
import { Clock } from 'lucide-react';

const MenuHeader = ({ shop, isDarkMode, lang, setLang, t }) => {
  return (
    <>
      {/* Holiday Mode / Closed Overlay */}
      {shop.holiday_mode && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          backdropFilter: 'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
          backgroundColor: 'rgba(7, 10, 19, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '3rem 2rem',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow-hover)',
            animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)'
          }}>
            <div style={{
              width: '88px', height: '88px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.75rem auto',
              border: '1px solid var(--card-border)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)'
            }}>
              <span style={{ fontSize: '2.75rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🔒</span>
            </div>
            <h2 style={{ margin: '0 0 0.85rem 0', fontSize: '1.65rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>{t.closedTitle}</h2>
            <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{t.closedMessage}</p>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              color: '#ef4444', 
              padding: '10px 22px', 
              borderRadius: '99px', 
              fontWeight: '700', 
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              <Clock size={16} />
              {t.restaurantStatusClosed}
            </div>
          </div>
        </div>
      )}

      <header className="customer-header-container">
        <div className="customer-header-banner">
          <div className="customer-header-overlay">
            <div className="customer-header-logo">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={`${shop.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              ) : (
                <span>☕</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="customer-shop-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shop.name}</h1>
              <p className="customer-proprietor" style={{ margin: '0.25rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Proprietor: {shop.owner_name}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menu live</span>
              </div>
              
              {/* Language Switcher Pill */}
              <button 
                aria-label={`Switch language to ${lang === 'EN' ? 'Telugu' : 'English'}`}
                style={{ 
                  display: 'flex', 
                  backgroundColor: 'rgba(7, 10, 19, 0.65)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '30px', 
                  padding: '3px', 
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s'
                }} 
                onClick={() => setLang(lang === 'EN' ? 'TE' : 'EN')}
              >
                <div style={{ 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  backgroundColor: lang === 'TE' ? 'var(--color-accent)' : 'transparent', 
                  color: 'white', 
                  fontWeight: '800', 
                  fontSize: '0.7rem', 
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: lang === 'TE' ? '0 2px 6px rgba(var(--color-accent-rgb), 0.2)' : 'none'
                }}>TE</div>
                <div style={{ 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  backgroundColor: lang === 'EN' ? 'var(--color-accent)' : 'transparent', 
                  color: 'white', 
                  fontWeight: '800', 
                  fontSize: '0.7rem', 
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: lang === 'EN' ? '0 2px 6px rgba(var(--color-accent-rgb), 0.2)' : 'none'
                }}>EN</div>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default MenuHeader;
