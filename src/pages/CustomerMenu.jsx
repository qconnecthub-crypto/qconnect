import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Bell, MessageSquare, X, CheckCircle, Star } from 'lucide-react';
import '../customer-menu.css';

import MenuHeader from '../components/Customer/MenuHeader';
import MenuGrid from '../components/Customer/MenuGrid';
import Cart from '../components/Customer/Cart';
import ActiveOrderTracker from '../components/Customer/ActiveOrderTracker';

const getNow = () => Date.now();

const isISTDayTime = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    return hour >= 6 && hour < 18;
  } catch {
    const utcDate = new Date();
    const utcHours = utcDate.getUTCHours();
    const utcMinutes = utcDate.getUTCMinutes();
    let istHours = (utcHours + 5) % 24;
    let istMinutes = utcMinutes + 30;
    if (istMinutes >= 60) {
      istHours = (istHours + 1) % 24;
    }
    return istHours >= 6 && istHours < 18;
  }
};

const getIcon = (name, type = 'item') => {
  const lower = name.toLowerCase();
  if (lower.includes('coffee') || lower.includes('espresso') || lower.includes('flat white')) return '☕';
  if (lower.includes('cappuccino') || lower.includes('latte') || lower.includes('milk')) return '🥛';
  if (lower.includes('cold') || lower.includes('ice')) return '🧊';
  if (lower.includes('macchiato') || lower.includes('dessert') || lower.includes('cake')) return '🍮';
  if (lower.includes('tea')) return '🍵';
  if (lower.includes('drink') || lower.includes('beverage')) return '🥥';
  return type === 'category' ? '🍽️' : '🍲';
};

const CustomerMenu = () => {
  const { shopId } = useParams();
  const [searchParams] = useSearchParams();
  const { lang, setLang, t } = useLanguage();

  const [shop, setShop] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');

  const [isDarkMode, setIsDarkMode] = useState(() => !isISTDayTime());
  const [isAnimatingTheme, setIsAnimatingTheme] = useState(false);

  const [tableNumber, setTableNumber] = useState('Unknown');
  const [tableId, setTableId] = useState(null);
  const [manualTableNumber, setManualTableNumber] = useState('');
  
  // Cartesian persistence in localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`cart_${shopId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  
  useEffect(() => {
    localStorage.setItem(`cart_${shopId}`, JSON.stringify(cart));
  }, [cart, shopId]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [activeOrder, setActiveOrder] = useState(null);
  const [isTableDeactivated, setIsTableDeactivated] = useState(false);

  // Waiter & Feedback state
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [showWaiterToast, setShowWaiterToast] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Theme Sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const expectedIsDay = isISTDayTime();
        if (isDarkMode === expectedIsDay) {
          setIsAnimatingTheme(true);
          setTimeout(() => {
            setIsDarkMode(!expectedIsDay);
            setTimeout(() => setIsAnimatingTheme(false), 800);
          }, 300);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isDarkMode]);

  useEffect(() => {
    const fetchShopAndMenu = async () => {
      let currentShopId = shopId;
      let currentShop = null;

      if (isUUID(shopId)) {
        const { data: tableData } = await supabase.from('shop_tables').select('*, shops(*)').eq('table_token', shopId).single();
        if (tableData) {
          if (!tableData.is_active) {
            setIsTableDeactivated(true);
            setLoading(false);
            return;
          }
          currentShop = tableData.shops;
          currentShopId = currentShop.id;
          setTableNumber(tableData.table_number);
          setTableId(tableData.id);
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { data: shopData } = await supabase.from('shops').select('*').eq('unique_id', shopId).single();
        if (shopData) {
          currentShop = shopData;
          currentShopId = currentShop.id;
          const urlTable = searchParams.get('table');
          if (urlTable) {
            setTableNumber(urlTable);
            const { data: maybeTable } = await supabase.from('shop_tables').select('*').eq('shop_id', currentShopId).eq('table_number', urlTable).single();
            if (maybeTable) {
              if (!maybeTable.is_active) {
                setIsTableDeactivated(true);
                setLoading(false);
                return;
              }
              setTableId(maybeTable.id);
            }
          }
        }
      }

      if (currentShop) {
        setShop(currentShop);
        // Optimize fetching with Promise.all
        const [catsRes, itmsRes] = await Promise.all([
          supabase.from('categories').select('*').eq('shop_id', currentShop.id),
          supabase.from('items').select('*, categories!inner(shop_id)').eq('categories.shop_id', currentShop.id),
          supabase.from('menu_views').insert([{ shop_id: currentShop.id }])
        ]);

        if (catsRes.data) setCategories(catsRes.data);
        if (itmsRes.data) setItems(itmsRes.data);
      }
      setLoading(false);
    };

    fetchShopAndMenu();
  }, [shopId, searchParams]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!shop) return;
    
    const shopChannel = supabase.channel(`customer-shop-${shop.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shops', filter: `id=eq.${shop.id}` }, (payload) => {
        setShop(payload.new);
      })
      .subscribe();
      
    const catChannel = supabase.channel(`customer-categories-${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `shop_id=eq.${shop.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setCategories(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setCategories(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        else if (payload.eventType === 'DELETE') setCategories(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();
      
    const itemsChannel = supabase.channel(`customer-items-${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data: cat } = await supabase.from('categories').select('shop_id').eq('id', payload.new.category_id).single();
          if (cat && cat.shop_id === shop.id) {
            setItems(prev => [...prev, { ...payload.new, categories: { shop_id: shop.id } }]);
          }
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id));
          setCart(prev => {
            const newCart = { ...prev };
            delete newCart[payload.old.id];
            return newCart;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(shopChannel);
      supabase.removeChannel(catChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [shop]);

  useEffect(() => {
    if (!activeOrder) return;
    const channel = supabase.channel(`customer-order-${activeOrder.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrder.id}` }, (payload) => {
        setActiveOrder(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [activeOrder]);

  const addToCart = (itemId) => setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  const removeFromCart = (itemId) => setCart(prev => {
    const newCart = { ...prev };
    if (newCart[itemId] > 1) newCart[itemId] -= 1;
    else delete newCart[itemId];
    return newCart;
  });

  const getCartTotal = () => {
    let total = 0;
    Object.keys(cart).forEach(itemId => {
      const item = items.find(i => i.id === itemId);
      if (item) total += item.price * cart[itemId];
    });
    return total;
  };

  const getCartItemCount = () => Object.values(cart).reduce((a, b) => a + b, 0);

  const placeOrder = async () => {
    if (Object.keys(cart).length === 0) return;
    
    const lastOrder = localStorage.getItem('last_order_placed');
    if (lastOrder && getNow() - parseInt(lastOrder, 10) < 15000) {
      alert("Please wait a few seconds before placing another order.");
      return;
    }

    let finalTableNumber = tableNumber;
    if (finalTableNumber === 'Unknown') {
      if (!manualTableNumber.trim()) {
        alert("Please enter your table number to place the order.");
        return;
      }
      finalTableNumber = manualTableNumber.trim();
    }

    setIsPlacingOrder(true);
    
    // Convert cart to array format for secure RPC
    const cartItemsArr = Object.keys(cart).map(itemId => ({
      item_id: itemId,
      quantity: cart[itemId]
    }));

    const { data: orderData, error: orderError } = await supabase.rpc('place_secure_order', {
      p_shop_id: shop.id,
      p_table_number: finalTableNumber,
      p_table_id: tableId,
      p_notes: orderNotes,
      p_cart_items: cartItemsArr
    });

    if (orderError || !orderData) {
      alert("Failed to place order securely. Please try again.");
      console.error(orderError);
      setIsPlacingOrder(false);
      return;
    }

    localStorage.setItem('last_order_placed', getNow().toString());

    // Fetch the new order details
    const { data: completeOrder } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderData.id)
      .single();

    setActiveOrder(completeOrder);
    setCart({});
    localStorage.removeItem(`cart_${shopId}`);
    setIsCartOpen(false);
    setIsPlacingOrder(false);
  };

  const callWaiter = async () => {
    const lastCall = localStorage.getItem('last_waiter_call');
    if (lastCall && getNow() - parseInt(lastCall, 10) < 60000) {
      alert("You already called the waiter recently. Please wait a moment.");
      return;
    }

    let tNum = tableNumber;
    if (tNum === 'Unknown') {
      const manualT = prompt("Please enter your table number:");
      if (!manualT || !manualT.trim()) return;
      tNum = manualT.trim();
    }

    setIsCallingWaiter(true);
    const { error } = await supabase.from('notifications').insert([
      { shop_id: shop.id, type: 'waiter_call', table_number: tNum }
    ]);
    setIsCallingWaiter(false);

    if (!error) {
      localStorage.setItem('last_waiter_call', getNow().toString());
      setShowWaiterToast(true);
      setTimeout(() => setShowWaiterToast(false), 4000);
    } else {
      alert("Failed to call waiter. Please try again.");
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('feedback').insert([
      { shop_id: shop.id, rating: feedbackRating, message: feedbackMessage, table_number: tableNumber }
    ]);
    setIsSubmitting(false);
    if (!error) {
      setFeedbackSuccess(true);
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackSuccess(false);
        setFeedbackMessage('');
        setFeedbackRating(5);
      }, 2500);
    } else {
      alert("Error submitting feedback. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#0f172a' : '#fdfbf7' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (isTableDeactivated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#0f172a' : '#fdfbf7', padding: '2rem', textAlign: 'center', color: isDarkMode ? '#f8fafc' : '#1a1a1a' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🚫</span>
        </div>
        <h1 style={{ marginBottom: '1rem', fontSize: '1.8rem', fontWeight: '800' }}>Table Not Available</h1>
        <p style={{ color: isDarkMode ? '#94a3b8' : '#6b7280', fontSize: '1.1rem' }}>This table QR code has been deactivated by the restaurant.</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#0f172a' : '#fdfbf7', color: isDarkMode ? '#f8fafc' : '#1a1a1a' }}>
        <p>Menu unavailable or invalid link.</p>
      </div>
    );
  }

  if (activeOrder) {
    return (
      <ActiveOrderTracker 
        activeOrder={activeOrder} 
        setActiveOrder={setActiveOrder} 
        isDarkMode={isDarkMode} 
      />
    );
  }

  return (
    <div className={`customer-page-wrapper ${isDarkMode ? 'customer-dark-mode' : ''}`} style={{ paddingBottom: getCartItemCount() > 0 ? '100px' : '0', transition: 'background-color 0.5s ease, color 0.5s ease' }}>
      
      {/* Theme Applying Animation Overlay */}
      <div className={`theme-applying-overlay ${isAnimatingTheme ? 'active' : ''}`}>
        <div className="theme-pulse">
          {isDarkMode ? '🌙' : '☀️'}
        </div>
        <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '1.2rem', color: '#ffffff' }}>
          Applying {isDarkMode ? 'Dark' : 'Light'} Theme...
        </p>
      </div>
      
      <MenuHeader 
        shop={shop} 
        isDarkMode={isDarkMode} 
        lang={lang} 
        setLang={setLang} 
        t={t} 
      />

      <MenuGrid 
        categories={categories}
        items={items}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        addToCart={addToCart}
        cart={cart}
        isDarkMode={isDarkMode}
        t={t}
        getIcon={getIcon}
      />

      <Cart 
        cart={cart}
        items={items}
        removeFromCart={removeFromCart}
        getCartTotal={getCartTotal}
        getCartItemCount={getCartItemCount}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        placeOrder={placeOrder}
        isPlacingOrder={isPlacingOrder}
        orderNotes={orderNotes}
        setOrderNotes={setOrderNotes}
        tableNumber={tableNumber}
        manualTableNumber={manualTableNumber}
        setManualTableNumber={setManualTableNumber}
        isDarkMode={isDarkMode}
        t={t}
      />

      {/* Floating Buttons */}
      <div style={{ position: 'fixed', bottom: getCartItemCount() > 0 ? '100px' : '2rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 30, transition: 'bottom 0.3s' }}>
        <button 
          id="call-waiter-btn"
          aria-label="Call waiter"
          onClick={callWaiter}
          disabled={isCallingWaiter}
          style={{
            backgroundColor: '#3b82f6', color: 'white', border: 'none',
            padding: '1rem', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto',
            opacity: isCallingWaiter ? 0.7 : 1
          }}
        >
          <Bell size={24} />
        </button>

        <button 
          id="open-feedback-btn"
          aria-label="Leave feedback"
          onClick={() => setIsFeedbackOpen(true)}
          style={{
            backgroundColor: '#1a1a1a', color: 'white', border: 'none',
            padding: '1rem', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto'
          }}
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: isDarkMode ? '#1e293b' : 'white', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: isDarkMode ? '1px solid #334155' : 'none' }}>
            <div style={{ padding: '1.5rem', borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDarkMode ? '#0f172a' : '#fdfbf7' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', color: isDarkMode ? '#f8fafc' : '#1a1a1a' }}>{t.leaveFeedback}</h3>
              <button 
                id="close-feedback-btn"
                aria-label="Close feedback"
                onClick={() => setIsFeedbackOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDarkMode ? '#94a3b8' : '#6b7280' }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {feedbackSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 1rem auto' }} />
                  <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: isDarkMode ? '#f8fafc' : '#1a1a1a' }}>{t.thankYou}</h4>
                  <p style={{ margin: '0.5rem 0 0 0', color: isDarkMode ? '#94a3b8' : '#6b7280', fontSize: '0.875rem' }}>{t.feedbackSent}</p>
                </div>
              ) : (
                <form onSubmit={submitFeedback}>
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: isDarkMode ? '#94a3b8' : '#374151' }}>{t.howWasExperience}</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          id={`star-rating-${star}`}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          type="button" 
                          onClick={() => setFeedbackRating(star)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Star size={32} fill={star <= feedbackRating ? "#f59e0b" : "transparent"} color={star <= feedbackRating ? "#f59e0b" : (isDarkMode ? '#475569' : '#d1d5db')} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="feedback-comments" style={{ display: 'block', margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: isDarkMode ? '#94a3b8' : '#374151' }}>{t.anyComments}</label>
                    <textarea 
                      id="feedback-comments"
                      value={feedbackMessage} 
                      onChange={e => setFeedbackMessage(e.target.value)} 
                      placeholder="..." 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: isDarkMode ? '1px solid #334155' : '1px solid #d1d5db', outline: 'none', minHeight: '100px', resize: 'vertical', fontSize: '0.875rem', fontFamily: 'inherit', backgroundColor: isDarkMode ? '#0f172a' : 'white', color: isDarkMode ? '#f8fafc' : '#1a1a1a' }} 
                    />
                  </div>
                  <button 
                    id="submit-feedback-btn"
                    type="submit" 
                    disabled={isSubmitting} 
                    style={{ width: '100%', padding: '1rem', borderRadius: '9999px', backgroundColor: '#ff6b35', color: 'white', fontWeight: '600', fontSize: '1rem', border: 'none', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    {isSubmitting ? t.sending : t.submitFeedback}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiter Toast */}
      {showWaiterToast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#3b82f6', color: 'white', padding: '16px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)', zIndex: 200, animation: 'slide-down 0.3s ease-out', minWidth: '300px', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
            <Bell size={24} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>{t.waiterCalled}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>{t.waiterComing}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
