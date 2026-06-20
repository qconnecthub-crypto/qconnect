import React from 'react';
import { Clock } from 'lucide-react';

const formatTime = (dateStr, addMinutes = 0) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--:--';
    if (addMinutes > 0) {
      date.setMinutes(date.getMinutes() + addMinutes);
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '--:--';
  }
};

const ActiveOrderTracker = ({ activeOrder, setActiveOrder, isDarkMode }) => {
  if (!activeOrder) return null;

  const statusMap = {
    pending: { label: 'Pending', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
    accepted: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    preparing: { label: 'Preparing', color: '#ff5e1a', bg: 'rgba(255, 94, 26, 0.1)' },
    ready: { label: 'Ready', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    delivered: { label: 'Served', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' }
  };

  const currentStatus = activeOrder.status || 'pending';
  const statusInfo = statusMap[currentStatus] || statusMap.pending;

  const steps = [
    { key: 'placed', label: 'Order Placed', desc: 'Order sent successfully.', offset: 0 },
    { key: 'confirmed', label: 'Confirmed', desc: 'Confirmed by kitchen.', offset: 1 },
    { key: 'preparing', label: 'Preparing', desc: 'Chef is preparing your meal.', offset: 4 },
    { key: 'ready', label: 'Ready', desc: 'Order is ready to serve.', offset: 12 },
    { key: 'served', label: 'Served', desc: 'Delivered to your table.', offset: 15 }
  ];

  const getStepState = (stepKey) => {
    // Determine completed/active/pending states
    const statusOrder = ['pending', 'accepted', 'preparing', 'ready', 'delivered'];
    const currentIdx = statusOrder.indexOf(currentStatus);
    
    if (stepKey === 'placed') {
      return currentIdx >= 0 ? (currentIdx === 0 ? 'active' : 'completed') : 'pending';
    }
    if (stepKey === 'confirmed') {
      return currentIdx >= 1 ? (currentIdx === 1 ? 'active' : 'completed') : 'pending';
    }
    if (stepKey === 'preparing') {
      return currentIdx >= 2 ? (currentIdx === 2 ? 'active' : 'completed') : 'pending';
    }
    if (stepKey === 'ready') {
      return currentIdx >= 3 ? (currentIdx === 3 ? 'active' : 'completed') : 'pending';
    }
    if (stepKey === 'served') {
      return currentIdx === 4 ? 'active' : 'pending'; // served active when delivered, completed not applicable since it's the last step
    }
    return 'pending';
  };

  const renderTimelineDot = (state) => {
    if (state === 'completed') {
      return (
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', zIndex: 10, boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '10px', height: '10px' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    
    if (state === 'active') {
      return (
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          border: '2px solid var(--color-accent)', backgroundColor: 'var(--bg-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          boxShadow: '0 0 8px var(--input-focus-shadow)'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }}></div>
        </div>
      );
    }
    
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        border: '2px solid var(--pill-border)', backgroundColor: 'var(--bg-secondary)',
        zIndex: 10
      }}></div>
    );
  };

  return (
    <div className={`customer-page-wrapper ${isDarkMode ? 'customer-dark-mode' : ''}`} style={{ 
      minHeight: '100vh', 
      padding: '2.5rem 1.25rem', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      alignItems: 'center',
      transition: 'background-color 0.4s ease, color 0.4s ease' 
    }}>
      
      {/* Active Order Card */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '28px',
        padding: '1.75rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: 'var(--card-shadow-hover)',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Active Order
          </h2>
          <button 
            onClick={() => setActiveOrder(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            View Details ›
          </button>
        </div>

        {/* Order Info & Status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Order #{activeOrder.order_number}
          </div>
          <div style={{
            color: statusInfo.color,
            backgroundColor: statusInfo.bg,
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '800',
            border: `1px solid ${statusInfo.color}33`,
            textTransform: 'capitalize'
          }}>
            {statusInfo.label}
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="customer-tracker-timeline">
          <div className="customer-timeline-line"></div>
          
          {steps.map((step) => {
            const state = getStepState(step.key);
            const timeVal = state !== 'pending' ? formatTime(activeOrder.created_at, step.offset) : '--:--';
            
            return (
              <div key={step.key} className="customer-timeline-item">
                {renderTimelineDot(state)}
                <div>
                  <p style={{ 
                    margin: 0, 
                    fontWeight: '700', 
                    fontSize: '0.92rem',
                    color: state !== 'pending' ? 'var(--text-primary)' : 'var(--text-muted)' 
                  }}>
                    {step.key === 'served' && activeOrder.status === 'delivered' ? 'Served' : step.label}
                  </p>
                </div>
                <div className="customer-timeline-time">
                  {timeVal}
                </div>
              </div>
            );
          })}
        </div>

        {/* Help Button */}
        <button style={{
          width: '100%',
          padding: '0.85rem',
          borderRadius: '14px',
          border: '1px solid var(--pill-border)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          color: 'var(--text-primary)',
          fontWeight: '700',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          marginTop: '1.5rem',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-body)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
        onClick={() => alert("Please contact waiter or counter support at the cafe.")}
        >
          <span>🎧</span> Need help?
        </button>
      </div>

      {/* Back button below card */}
      <button 
        onClick={() => setActiveOrder(null)} 
        style={{ 
          marginTop: '2rem', 
          padding: '0.75rem 1.5rem', 
          borderRadius: '12px', 
          border: '1px solid var(--pill-border)', 
          backgroundColor: 'var(--card-bg)', 
          color: 'var(--text-secondary)', 
          fontWeight: '600', 
          cursor: 'pointer', 
          transition: 'all 0.2s',
          fontSize: '0.88rem'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        Back to Menu
      </button>
    </div>
  );
};

export default ActiveOrderTracker;
