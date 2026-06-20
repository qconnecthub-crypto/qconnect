import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';

const ReceiptView = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: fetchErr } = await supabase
          .from('orders')
          .select('*, order_items(*), shops(*)')
          .eq('id', orderId)
          .single();

        if (fetchErr) throw fetchErr;
        if (!data) throw new Error('Order not found');
        
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order receipt:', err);
        setError(err.message || 'Receipt could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes} ${ampm}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // improve quality
        useCORS: true, // handle cross-origin images
        backgroundColor: '#faf8f5'
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `receipt-${order?.order_number || 'bill'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error rendering PNG receipt:', err);
      alert('Failed to download receipt as image. Please try again.');
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Receipt for ${order?.shops?.name || 'Cafe'}`,
        text: `Check out receipt ${order?.order_number || ''}`,
        url: shareUrl
      }).catch((err) => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#faf8f5' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.05)', borderTop: '4px solid #4a2c2a', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#faf8f5', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Something went wrong</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'The receipt could not be loaded.'}</p>
        <button onClick={() => navigate(-1)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4a2c2a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Go Back</button>
      </div>
    );
  }

  const shopName = order.shops?.name || 'CAFE WALA';
  const feedbackLink = `${window.location.origin}/menu/${order.shops?.owner_unique_id || order.shop_id}?feedback=true`;

  return (
    <div style={{
      backgroundColor: '#faf8f5',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1.5rem 1rem',
      fontFamily: "'Outfit', sans-serif",
      color: '#1a1a1a'
    }}>
      
      {/* Top Header Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '420px',
        marginBottom: '2rem',
        padding: '0 0.5rem'
      }}>
        <button 
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a1a', display: 'flex', alignItems: 'center', padding: '8px' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{
          margin: 0,
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.5rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>{shopName}</h1>
        <button 
          onClick={() => navigate(-1)}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a1a', display: 'flex', alignItems: 'center', padding: '8px' }}
        >
          <X size={24} />
        </button>
      </header>

      {/* Printable Receipt Card Ref */}
      <div 
        ref={receiptRef}
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          border: '1px solid rgba(0, 0, 0, 0.03)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
          padding: '2.5rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Success Circle Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#4a2c2a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>✓</span>
        </div>

        <h2 style={{
          margin: '0 0 4px 0',
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1a1a1a'
        }}>Thank You</h2>
        
        <span style={{
          fontSize: '0.8rem',
          fontWeight: '700',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#8c8c8c',
          marginBottom: '1.75rem'
        }}>{shopName}</span>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', backgroundColor: '#eef0f2', marginBottom: '1.5rem' }} />

        {/* Metadata Details Grid */}
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          rowGap: '1.25rem',
          columnGap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Order ID</span>
            <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1a1a1a' }}>{order.order_number}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Table</span>
            <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1a1a1a' }}>{order.table_number || 'N/A'}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Date</span>
            <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1a1a1a' }}>{formatDate(order.created_at)}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Time</span>
            <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1a1a1a' }}>{formatTime(order.created_at)}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', backgroundColor: '#eef0f2', marginBottom: '1.5rem' }} />

        {/* Ordered Items List */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
          {order.order_items && order.order_items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
              <span style={{ color: '#1a1a1a', fontWeight: '500' }}>
                <span style={{ fontWeight: '700', color: '#8c8c8c', marginRight: '6px' }}>{item.quantity}x</span>
                {item.item_name}
              </span>
              <span style={{ fontWeight: '700', color: '#1a1a1a' }}>{formatCurrency(item.price_at_time * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Dashed Divider */}
        <div style={{ width: '100%', borderTop: '1px dashed #ced4da', marginBottom: '1.5rem' }} />

        {/* Total Amount Row */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '2rem'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Amount</span>
          <span style={{ fontSize: '1.65rem', fontWeight: '800', color: '#1a1a1a', fontFamily: "'Playfair Display', serif" }}>{formatCurrency(order.total_amount)}</span>
        </div>

        {/* Feedback Section */}
        <div style={{
          width: '100%',
          backgroundColor: '#faf3ee',
          borderRadius: '20px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: '700',
            color: '#4a2c2a',
            marginBottom: '0.75rem'
          }}>Scan to share feedback</span>
          
          <div style={{
            backgroundColor: '#4a2c2a',
            padding: '12px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ backgroundColor: '#ffffff', padding: '6px', borderRadius: '8px' }}>
              <QRCodeSVG value={feedbackLink} size={84} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Below Receipt */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        width: '100%',
        maxWidth: '400px',
        marginTop: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <button 
          onClick={handleDownload}
          style={{
            flex: 1,
            backgroundColor: '#1f1615',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            padding: '1rem',
            fontWeight: '700',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <Download size={18} />
          Download Receipt
        </button>
        <button 
          onClick={handleShare}
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            color: '#1f1615',
            border: '1px solid #eef0f2',
            borderRadius: '16px',
            padding: '1rem',
            fontWeight: '700',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <Share2 size={18} />
          {copied ? 'Link Copied!' : 'Share'}
        </button>
      </div>

      {/* New Order link */}
      <button 
        onClick={() => navigate(`/menu/${order.shops?.owner_unique_id || order.shop_id}`)}
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '3rem'
        }}
      >
        New Order
      </button>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        marginTop: 'auto',
        paddingTop: '2rem',
        borderTop: '1px solid #eef0f2',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h3 style={{
          margin: '0 0 0.75rem 0',
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.2rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>{shopName}</h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          fontSize: '0.85rem',
          color: '#64748b',
          marginBottom: '1rem'
        }}>
          <span>Instagram</span>
          <span>Facebook</span>
          <span>Twitter</span>
        </div>
        
        <p style={{
          margin: 0,
          fontSize: '0.75rem',
          color: '#8c8c8c'
        }}>© 2026 {shopName}. Made with heart.</p>
      </footer>
    </div>
  );
};

export default ReceiptView;
