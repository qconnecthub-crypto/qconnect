import React, { useState } from 'react';
import { ArrowLeft, Wallet, Store, UtensilsCrossed, ShoppingBag, Clock } from 'lucide-react';

const CheckoutView = ({ 
  shop, 
  tableNumber, 
  setTableNumber, 
  cart, 
  items, 
  getCartTotal, 
  getCartItemCount, 
  placeOrder, 
  isPlacingOrder, 
  onBack, 
  isDarkMode 
}) => {
  const [selectedMethod, setSelectedMethod] = useState('Pay After Meal');
  const [manualTableNumber, setManualTableNumber] = useState(tableNumber || '');

  const paymentMethods = [
    //     {
    //   id: 'Pay Online',
    //   title: 'Pay Online (UPI/Card)',
    //   subtext: 'Google Pay, PhonePe, Card',
    //   icon: Wallet,
    // },
    {
      id: 'Pay at Counter',
      title: 'Pay at Counter',
      subtext: 'Settle before you leave',
      icon: Store,
    },
    {
      id: 'Pay After Meal',
      title: 'Pay After Meal',
      subtext: 'Waiter will bring the bill',
      icon: UtensilsCrossed,
    }
  ];

  const handlePlaceOrder = () => {
    // Save table number back to parent if updated
    if (manualTableNumber.trim()) {
      setTableNumber(manualTableNumber.trim());
    }
    // Call placeOrder passing the selected payment method
    placeOrder(selectedMethod, manualTableNumber.trim());
  };

  const grandTotal = getCartTotal();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#100c0a',
      color: '#f8fafc',
      fontFamily: "'Outfit', sans-serif",
      paddingBottom: '120px',
      position: 'relative'
    }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1.25rem 1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backgroundColor: '#17110f',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '1rem'
          }}
          aria-label="Go back to menu"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Checkout</h1>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#a3a3a3', fontWeight: '500' }}>
            Table {manualTableNumber || 'Takeaway'} • {shop.name}
          </p>
        </div>
      </header>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Section: Confirm Table Number */}
        <section style={{
          backgroundColor: '#1c1512',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1rem'
        }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.05em' }}>
            Confirm Table Number
          </h2>
          <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: '#a3a3a3' }}>
            Please confirm your active table number to receive your items.
          </p>
          <input 
            type="text"
            value={manualTableNumber}
            onChange={(e) => setManualTableNumber(e.target.value)}
            placeholder="e.g. 5, T-07, or Takeaway"
            style={{
              width: '100%',
              backgroundColor: '#100c0a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: '600',
              boxSizing: 'border-box',
              outline: 'none'
            }}
            aria-label="Confirm Table number"
          />
        </section>

        {/* Section: Payment Method */}
        <section style={{
          backgroundColor: '#1c1512',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.05em' }}>
            Payment Method
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {paymentMethods.map(method => {
              const isSelected = selectedMethod === method.id;
              const IconComponent = method.icon;
              
              return (
                <div 
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'rgba(255, 109, 0, 0.06)' : '#100c0a',
                    border: isSelected ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    gap: '1rem'
                  }}
                >
                  {/* Styled Radio Input */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '5px solid var(--color-accent)' : '2px solid #525252',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }} />

                  {/* Icon Circle */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(255, 109, 0, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? 'var(--color-accent)' : '#a3a3a3',
                    flexShrink: 0
                  }}>
                    <IconComponent size={20} />
                  </div>

                  {/* Text Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>
                      {method.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a3a3a3', marginTop: '2px' }}>
                      {method.subtext}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: Order Summary */}
        <section style={{
          backgroundColor: '#1c1512',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1rem'
        }}>
          <h2 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.05em' }}>
            Order Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {Object.keys(cart).map(cartKey => {
              const cartItem = cart[cartKey];
              const item = items.find(i => i.id === cartItem.itemId);
              if (!item) return null;

              const basePrice = parseFloat(item.price);
              const addonsPrice = cartItem.customizations?.addons?.reduce((sum, a) => sum + parseFloat(a.price), 0) || 0;
              const singleTotal = basePrice + addonsPrice;

              return (
                <div key={cartKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--color-accent)' }}>
                        {cartItem.quantity}x
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </div>
                    
                    {/* Render Customizations */}
                    {cartItem.customizations && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginTop: '3px', paddingLeft: '22px' }}>
                        {cartItem.customizations.spiceLevel && (
                          <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: '600' }}>
                            🌶️ {cartItem.customizations.spiceLevel}
                          </span>
                        )}
                        {cartItem.customizations.sweetnessLevel && (
                          <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: '600' }}>
                            🍬 {cartItem.customizations.sweetnessLevel}
                          </span>
                        )}
                        {cartItem.customizations.addons?.map((addon, index) => (
                          <span key={index} style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '600' }}>
                            ➕ {addon.name}
                          </span>
                        ))}
                        {cartItem.customizations.specialInstructions && (
                          <span style={{ fontSize: '0.72rem', color: '#d4d4d4', fontStyle: 'italic', width: '100%' }}>
                            Note: "{cartItem.customizations.specialInstructions}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff', flexShrink: 0 }}>
                    ₹{(singleTotal * cartItem.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}

            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)', margin: '0.5rem 0' }} />

            {/* Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#a3a3a3' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* Sticky Bottom Bar */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#17110f',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total to pay
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>
            ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || getCartItemCount() === 0}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            padding: '1rem 2rem',
            fontSize: '0.98rem',
            fontWeight: '800',
            cursor: isPlacingOrder ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(255, 109, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          {isPlacingOrder ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white' }}></div>
              Placing Order...
            </>
          ) : (
            'Place Order'
          )}
        </button>
      </footer>
    </div>
  );
};

export default CheckoutView;
