import React from 'react';
import { ShoppingBag, X, AlertTriangle } from 'lucide-react';

const Cart = ({ 
  cart, 
  items, 
  addToCart,
  removeFromCart, 
  clearCart,
  getCartTotal, 
  getCartItemCount, 
  isCartOpen, 
  setIsCartOpen, 
  onProceedToCheckout, 
  orderNotes, 
  setOrderNotes, 
  tableNumber, 
  manualTableNumber, 
  setManualTableNumber, 
  isDarkMode, 
  t 
}) => {
  if (getCartItemCount() === 0 && !isCartOpen) return null;

  const mockSavings = Math.max(10, Math.round(getCartTotal() * 0.1));

  // Check if any cart items are currently unavailable
  const unavailableCartItems = Object.keys(cart).filter(cartKey => {
    const cartItem = cart[cartKey];
    const item = items.find(i => i.id === cartItem.itemId);
    return item && item.is_available === false;
  });
  const hasUnavailableItems = unavailableCartItems.length > 0;

  return (
    <>
      {/* Bottom Screen Cart Banner */}
      {getCartItemCount() > 0 && !isCartOpen && (
        <div 
          id="view-cart-bar-btn"
          className="customer-bottom-cart-bar" 
          onClick={() => setIsCartOpen(true)} 
          aria-label="View Cart"
        >
          <div className="customer-cart-info-left">
            <div className="customer-cart-icon-circle">
              <ShoppingBag size={18} />
              <span className="customer-cart-badge-count" data-count={getCartItemCount()}></span>
            </div>
            <div>
              <div className="customer-cart-text-main">
                {getCartItemCount()} {getCartItemCount() === 1 ? 'ITEM' : 'ITEMS'} | ₹{getCartTotal()}
              </div>
              <div className="customer-cart-text-sub">
                You save ₹{mockSavings} on this order
              </div>
            </div>
          </div>
          <button className="customer-cart-btn-right">
            View Cart
            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>›</span>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(7, 10, 19, 0.7)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1000, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'flex-end', 
          animation: 'fadeIn 0.2s ease' 
        }}>
          <div style={{ 
            height: '85vh', 
            backgroundColor: 'var(--card-bg)', 
            borderTopLeftRadius: '32px', 
            borderTopRightRadius: '32px', 
            borderTop: '1px solid var(--card-border)',
            padding: '1.5rem 1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            animation: 'slideUp 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
            boxShadow: '0 -15px 40px rgba(0, 0, 0, 0.15)'
          }}>
            
            {/* Cart Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>Your Cart</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <button 
                  onClick={clearCart}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-accent)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  Clear
                </button>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: 'none', 
                    color: 'var(--text-secondary)', 
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }} 
                  aria-label="Close cart"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: '600' }}>
              {getCartItemCount()} {getCartItemCount() === 1 ? 'Item' : 'Items'}
            </div>

            {/* Cart Items List */}
            <div className="customer-custom-scrollbar" style={{ flex: 1, overflowY: 'auto', marginBottom: '1.25rem', paddingRight: '0.25rem' }}>
              {Object.keys(cart).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                  <ShoppingBag size={44} style={{ opacity: 0.15, marginBottom: '1rem', color: 'var(--text-primary)' }} />
                  <p style={{ fontWeight: '600' }}>Your cart is empty</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.keys(cart).map(cartKey => {
                    const cartItem = cart[cartKey];
                    const item = items.find(i => i.id === cartItem.itemId);
                    if (!item) return null;
                    
                    const addonsTotal = cartItem.customizations?.addons?.reduce((sum, a) => sum + parseFloat(a.price), 0) || 0;
                    const singlePrice = parseFloat(item.price) + addonsTotal;
                    const subtotal = singlePrice * cartItem.quantity;

                    return (
                      <div key={cartKey} style={{ display: 'flex', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--pill-border)', gap: '12px', position: 'relative', opacity: item.is_available === false ? 0.5 : 1 }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                            🍲
                          </div>
                        )}
                        
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            ₹{singlePrice.toFixed(2)}
                          </p>
                          
                          {cartItem.customizations && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {cartItem.customizations.spiceLevel && (
                                <span style={{ fontWeight: '500' }}>🌶️ Spice: {cartItem.customizations.spiceLevel}</span>
                              )}
                              {cartItem.customizations.sweetnessLevel && (
                                <span style={{ fontWeight: '500' }}>🍭 Sweetness: {cartItem.customizations.sweetnessLevel}</span>
                              )}
                              {cartItem.customizations.addons && cartItem.customizations.addons.length > 0 && (
                                <span style={{ fontWeight: '500' }}>➕ Add-ons: {cartItem.customizations.addons.map(a => a.name).join(', ')}</span>
                              )}
                              {cartItem.customizations.specialInstructions && (
                                <span style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>📝 "{cartItem.customizations.specialInstructions}"</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Drawer Counter Control */}
                        <div className="customer-card-counter" style={{ padding: '2px 4px', gap: '4px' }}>
                          <button 
                            onClick={() => removeFromCart(cartItem.itemId, cartItem.customizations)}
                            style={{ width: '22px', height: '22px', fontSize: '1rem' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.85rem', minWidth: '12px', textAlign: 'center' }}>{cartItem.quantity}</span>
                          <button 
                            onClick={() => addToCart(item, 1, cartItem.customizations)}
                            style={{ width: '22px', height: '22px', fontSize: '1rem' }}
                          >
                            +
                          </button>
                        </div>
                        
                        <div style={{ minWidth: '50px', textAlign: 'right', fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          ₹{subtotal.toFixed(2)}
                        </div>
                        {/* Unavailable warning tag */}
                        {item.is_available === false && (
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(7, 10, 19, 0.5)',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '6px'
                          }}>
                            <span style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em'
                            }}>Unavailable</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {Object.keys(cart).length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Add a note (optional)
                  </label>
                  <textarea 
                    id="order-notes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="No onion, less sugar..."
                    className="customer-textarea"
                    style={{ height: '70px', resize: 'none' }}
                    aria-label="Order notes"
                  />
                  
                  {tableNumber === 'Unknown' && (
                    <div style={{ 
                      marginTop: '1.25rem', 
                      backgroundColor: 'var(--color-accent-light)', 
                      padding: '1rem', 
                      borderRadius: '12px', 
                      borderLeft: '4px solid var(--color-accent)'
                    }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Please enter your Table Number
                      </label>
                      <input 
                        type="text"
                        value={manualTableNumber}
                        onChange={(e) => setManualTableNumber(e.target.value)}
                        placeholder="e.g. 5 or Patio-2"
                        className="customer-input"
                        required
                        aria-label="Table number"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calculations & Checkout */}
            {Object.keys(cart).length > 0 && (
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--pill-border)', marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>₹{getCartTotal()}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⏱ Estimated time</span>
                  <span style={{ fontWeight: '700' }}>10-15 min</span>
                </div>

                <button 
                  id="place-order-btn"
                  onClick={onProceedToCheckout}
                  disabled={Object.keys(cart).length === 0 || hasUnavailableItems}
                  className="customer-add-btn"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '16px',
                    backgroundColor: hasUnavailableItems ? 'var(--text-muted)' : 'var(--color-accent)',
                    color: 'white',
                    cursor: hasUnavailableItems ? 'not-allowed' : 'pointer',
                    boxShadow: hasUnavailableItems ? 'none' : '0 8px 24px rgba(var(--color-accent-rgb), 0.3)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '1.02rem',
                    fontWeight: '800'
                  }}
                  aria-label="Proceed to checkout"
                >
                  Proceed to Checkout
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>›</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Cart;
