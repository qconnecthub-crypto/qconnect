import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Bell, MessageSquare, X, CheckCircle, Star, AlertTriangle } from 'lucide-react';
import '../customer-menu.css';

import MenuHeader from '../components/Customer/MenuHeader';
import MenuGrid from '../components/Customer/MenuGrid';
import Cart from '../components/Customer/Cart';
import ActiveOrderTracker from '../components/Customer/ActiveOrderTracker';
import ItemDetailModal from '../components/Customer/ItemDetailModal';
import CheckoutView from '../components/Customer/CheckoutView';

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
  
  // Cartesian persistence in localStorage (sanitized for new customizations object structure)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`cart_${shopId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = {};
        Object.keys(parsed).forEach(key => {
          if (typeof parsed[key] === 'number') {
            sanitized[key] = {
              itemId: key,
              quantity: parsed[key],
              customizations: null
            };
          } else if (parsed[key] && typeof parsed[key] === 'object' && parsed[key].itemId) {
            sanitized[key] = parsed[key];
          }
        });
        return sanitized;
      }
    } catch (err) {
      console.error(err);
    }
    return {};
  });
  
  useEffect(() => {
    localStorage.setItem(`cart_${shopId}`, JSON.stringify(cart));
  }, [cart, shopId]);

  const [activeItemForDetail, setActiveItemForDetail] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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

  // Unavailable items modal state
  const [unavailableItems, setUnavailableItems] = useState([]);

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
          setTableNumber(tableData.table_number);
          setTableId(tableData.id);
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { data: shopData } = await supabase.from('shops').select('*').eq('owner_unique_id', shopId).single();
        if (shopData) {
          currentShop = shopData;
          const urlTable = searchParams.get('table');
          if (urlTable) {
            setTableNumber(urlTable);
            const { data: maybeTable } = await supabase.from('shop_tables').select('*').eq('shop_id', currentShop.id).eq('table_number', urlTable).single();
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
        const [catsRes, itmsRes] = await Promise.all([
          supabase.from('categories').select('*').eq('shop_id', currentShop.id),
          supabase.from('items').select('*, categories!inner(shop_id)').eq('categories.shop_id', currentShop.id),
          supabase.from('menu_views').insert([{ shop_id: currentShop.id }])
        ]);

        if (catsRes.data) setCategories(catsRes.data);
        if (itmsRes.data) setItems(itmsRes.data);

        // Sync last placed order status
        const lastOrderId = localStorage.getItem(`last_order_id_${currentShop.id}`);
        if (lastOrderId) {
          const { data: order } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', lastOrderId)
            .maybeSingle();
          
          if (order && order.status !== 'delivered' && order.status !== 'rejected') {
            setActiveOrder(order);
          }
        }
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
          // Auto-remove from cart if item became unavailable
          if (payload.new.is_available === false) {
            setCart(prev => {
              const newCart = { ...prev };
              delete newCart[payload.new.id];
              return newCart;
            });
          }
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

  const getCartKey = (itemId, customizations) => {
    if (!customizations) return itemId;
    const { spiceLevel, sweetnessLevel, addons, specialInstructions } = customizations;
    const addonIds = addons ? addons.map(a => a.id).sort().join(',') : '';
    return `${itemId}_${spiceLevel || ''}_${sweetnessLevel || ''}_${addonIds}_${specialInstructions || ''}`;
  };

  const addToCart = (item, qty = 1, customizations = null) => {
    const resolvedItem = typeof item === 'string' ? items.find(i => i.id === item) : item;
    if (!resolvedItem) return;

    const cartKey = getCartKey(resolvedItem.id, customizations);
    setCart(prev => {
      const existing = prev[cartKey];
      const newQty = (existing ? existing.quantity : 0) + qty;
      return {
        ...prev,
        [cartKey]: {
          itemId: resolvedItem.id,
          quantity: newQty,
          customizations
        }
      };
    });
  };

  const removeFromCart = (itemId, customizations = null) => {
    setCart(prev => {
      const newCart = { ...prev };
      const targetKey = customizations
        ? getCartKey(itemId, customizations)
        : Object.keys(newCart).find(key => key === itemId || key.startsWith(`${itemId}_`));

      if (targetKey && newCart[targetKey]) {
        if (newCart[targetKey].quantity > 1) {
          newCart[targetKey] = {
            ...newCart[targetKey],
            quantity: newCart[targetKey].quantity - 1
          };
        } else {
          delete newCart[targetKey];
        }
      }
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
    localStorage.removeItem(`cart_${shopId}`);
  };

  const getCartTotal = () => {
    let total = 0;
    Object.keys(cart).forEach(cartKey => {
      const cartItem = cart[cartKey];
      const item = items.find(i => i.id === cartItem.itemId);
      if (item) {
        const basePrice = parseFloat(item.price);
        const addonsPrice = cartItem.customizations?.addons?.reduce((sum, a) => sum + parseFloat(a.price), 0) || 0;
        total += (basePrice + addonsPrice) * cartItem.quantity;
      }
    });
    return total;
  };

  const getCartItemCount = () => Object.values(cart).reduce((sum, entry) => sum + (entry.quantity || 0), 0);

  const placeOrder = async (paymentMethod = 'Pay After Meal', customTableNumber = '') => {
    if (Object.keys(cart).length === 0) return;
    
    const lastOrder = localStorage.getItem('last_order_placed');
    if (lastOrder && getNow() - parseInt(lastOrder, 10) < 15000) {
      alert("Please wait a few seconds before placing another order.");
      return;
    }

    let finalTableNumber = customTableNumber || tableNumber;
    if (finalTableNumber === 'Unknown' || !finalTableNumber.trim()) {
      alert("Please enter your table number to place the order.");
      return;
    }

    setIsPlacingOrder(true);
    
    // Convert cart to array format for secure RPC, resolving add-ons to separate items
    const cartItemsArr = [];
    const customizationNotes = [];

    Object.keys(cart).forEach(cartKey => {
      const cartItem = cart[cartKey];
      const mainItem = items.find(i => i.id === cartItem.itemId);
      if (!mainItem) return;

      cartItemsArr.push({
        item_id: cartItem.itemId,
        quantity: cartItem.quantity
      });

      let itemNote = `${mainItem.name}`;
      const custParts = [];

      if (cartItem.customizations) {
        const { spiceLevel, sweetnessLevel, addons, specialInstructions } = cartItem.customizations;
        if (spiceLevel) custParts.push(`Spice: ${spiceLevel}`);
        if (sweetnessLevel) custParts.push(`Sweetness: ${sweetnessLevel}`);
        if (specialInstructions) custParts.push(`Note: "${specialInstructions}"`);

        if (addons && addons.length > 0) {
          const addonNames = [];
          addons.forEach(addon => {
            const dbAddonItem = items.find(i => i.name.toLowerCase() === addon.name.toLowerCase());
            if (dbAddonItem) {
              cartItemsArr.push({
                item_id: dbAddonItem.id,
                quantity: cartItem.quantity
              });
              addonNames.push(`${addon.name} (+₹${addon.price})`);
            } else {
              addonNames.push(`${addon.name} (Not in DB menu)`);
            }
          });
          if (addonNames.length > 0) {
            custParts.push(`Add-ons: [${addonNames.join(', ')}]`);
          }
        }
      }

      if (custParts.length > 0) {
        itemNote += ` (${custParts.join(' | ')})`;
        customizationNotes.push(itemNote);
      }
    });

    let finalNotes = orderNotes;
    if (customizationNotes.length > 0) {
      const serializedCustoms = `[CUSTOMIZATIONS: ${customizationNotes.join('; ')}]`;
      finalNotes = finalNotes ? `${finalNotes} ${serializedCustoms}` : serializedCustoms;
    }

    const { data: orderData, error: orderError } = await supabase.rpc('place_secure_order', {
      p_shop_id: shop.id,
      p_table_number: finalTableNumber,
      p_table_id: tableId,
      p_notes: finalNotes,
      p_cart_items: cartItemsArr,
      p_payment_method: paymentMethod
    });

    if (orderError || !orderData) {
      alert("Failed to place order. Please try again.");
      console.error(orderError);
      setIsPlacingOrder(false);
      return;
    }

    // Handle unavailable items response from backend
    if (orderData.error && orderData.error_type === 'items_unavailable') {
      setUnavailableItems(orderData.unavailable_items || []);
      const { data: freshItems } = await supabase
        .from('items')
        .select('*, categories!inner(shop_id)')
        .eq('categories.shop_id', shop.id);
      if (freshItems) setItems(freshItems);
      setIsPlacingOrder(false);
      return;
    }

    localStorage.setItem('last_order_placed', getNow().toString());
    localStorage.setItem(`last_order_id_${shop.id}`, orderData.id);

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
    setIsCheckoutOpen(false);
    setIsPlacingOrder(false);
  };

  const callWaiter = async () => {
    const lastCall = localStorage.getItem('last_waiter_call');
    if (lastCall && getNow() - parseInt(lastCall, 10) < 30000) {
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
      { 
        shop_id: shop.id, 
        type: 'waiter', 
        title: 'Waiter Request', 
        message: `Table ${tNum} requested a waiter.` 
      }
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

  const handleOrderHistoryClick = () => {
    const lastOrderId = localStorage.getItem(`last_order_id_${shop?.id}`);
    if (lastOrderId) {
      window.location.href = `/receipt/${lastOrderId}`;
    } else {
      alert("No recent order history found on this device.");
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

  if (isCheckoutOpen) {
    return (
      <CheckoutView
        shop={shop}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        cart={cart}
        items={items}
        getCartTotal={getCartTotal}
        getCartItemCount={getCartItemCount}
        placeOrder={placeOrder}
        isPlacingOrder={isPlacingOrder}
        onBack={() => setIsCheckoutOpen(false)}
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
        tableNumber={tableNumber}
        onOrderHistoryClick={handleOrderHistoryClick}
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
        removeFromCart={removeFromCart}
        cart={cart}
        isDarkMode={isDarkMode}
        t={t}
        getIcon={getIcon}
        onItemClick={setActiveItemForDetail}
      />

      <Cart 
        cart={cart}
        items={items}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        getCartTotal={getCartTotal}
        getCartItemCount={getCartItemCount}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        orderNotes={orderNotes}
        setOrderNotes={setOrderNotes}
        tableNumber={tableNumber}
        manualTableNumber={manualTableNumber}
        setManualTableNumber={setManualTableNumber}
        isDarkMode={isDarkMode}
        t={t}
      />

      {/* Floating Buttons */}
      <div 
        className="customer-fab-container" 
        style={{ bottom: getCartItemCount() > 0 ? '92px' : '1.5rem' }}
      >
        <button 
          id="call-waiter-btn"
          className="customer-fab"
          aria-label="Call waiter"
          onClick={callWaiter}
          disabled={isCallingWaiter}
          style={{ opacity: isCallingWaiter ? 0.6 : 1 }}
        >
          <Bell size={24} />
        </button>

        <button 
          id="open-feedback-btn"
          className="customer-fab"
          aria-label="Leave feedback"
          onClick={() => setIsFeedbackOpen(true)}
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="customer-modal-backdrop">
          <div className="customer-modal">
            <div className="customer-modal-header">
              <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--text-primary)' }}>{t.leaveFeedback}</h3>
              <button 
                id="close-feedback-btn"
                aria-label="Close feedback"
                onClick={() => setIsFeedbackOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '1.5rem 1.75rem' }}>
              {feedbackSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
                  <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)' }}>{t.thankYou}</h4>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t.feedbackSent}</p>
                </div>
              ) : (
                <form onSubmit={submitFeedback}>
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{t.howWasExperience}</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          id={`star-rating-${star}`}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          type="button" 
                          onClick={() => setFeedbackRating(star)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', transition: 'transform 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Star size={32} fill={star <= feedbackRating ? "var(--color-accent)" : "transparent"} color={star <= feedbackRating ? "var(--color-accent)" : "var(--text-muted)"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="feedback-comments" style={{ display: 'block', margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{t.anyComments}</label>
                    <textarea 
                      id="feedback-comments"
                      value={feedbackMessage} 
                      onChange={e => setFeedbackMessage(e.target.value)} 
                      placeholder="Your review helps us improve..." 
                      className="customer-textarea"
                      style={{ minHeight: '110px', resize: 'vertical' }}
                    />
                  </div>
                  <button 
                    id="submit-feedback-btn"
                    type="submit" 
                    disabled={isSubmitting} 
                    className="customer-add-btn"
                    style={{ width: '100%', padding: '1.1rem', borderRadius: '30px', fontSize: '0.95rem' }}
                  >
                    {isSubmitting ? t.sending : t.submitFeedback}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unavailable Items Modal */}
      {unavailableItems.length > 0 && (
        <div className="customer-modal-backdrop">
          <div className="customer-modal">
            <div className="customer-modal-header">
              <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#eab308" />
                Items Unavailable
              </h3>
              <button 
                aria-label="Close unavailability alert"
                onClick={() => setUnavailableItems([])} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '72px', height: '72px', borderRadius: '50%',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                margin: '0 auto 1.25rem auto',
                border: '1px solid rgba(234, 179, 8, 0.15)'
              }}>
                <span style={{ fontSize: '2rem' }}>😔</span>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0', lineHeight: '1.55' }}>
                Some items in your cart are no longer available.
              </p>
              <div style={{
                backgroundColor: 'rgba(234, 179, 8, 0.06)',
                border: '1px solid rgba(234, 179, 8, 0.12)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unavailable:</p>
                {unavailableItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: idx > 0 ? '1px solid rgba(234, 179, 8, 0.08)' : 'none' }}>
                    <span style={{ color: '#eab308', fontSize: '0.8rem' }}>•</span>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</span>
                  </div>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
                Please remove {unavailableItems.length === 1 ? 'this item' : 'these items'} or choose alternatives before placing your order.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    // Auto-remove all unavailable items from cart
                    setCart(prev => {
                      const newCart = { ...prev };
                      unavailableItems.forEach(item => delete newCart[item.item_id]);
                      return newCart;
                    });
                    setUnavailableItems([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.85rem',
                    borderRadius: '14px',
                    border: '1px solid var(--pill-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.2s'
                  }}
                >
                  Remove Items
                </button>
                <button
                  onClick={() => {
                    setUnavailableItems([]);
                    setIsCartOpen(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.85rem',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    boxShadow: '0 4px 12px rgba(var(--color-accent-rgb), 0.25)',
                    transition: 'all 0.2s'
                  }}
                >
                  Browse Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={activeItemForDetail}
        isOpen={!!activeItemForDetail}
        onClose={() => setActiveItemForDetail(null)}
        onAdd={addToCart}
      />

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
