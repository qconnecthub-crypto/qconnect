import React, { useState } from 'react';
import { Search, SlidersHorizontal, Heart } from 'lucide-react';

const isVegItem = (itemName) => {
  const lower = itemName.toLowerCase();
  if (lower.includes('chicken') || lower.includes('egg') || lower.includes('meat') || lower.includes('fish') || lower.includes('mutton') || lower.includes('pork') || lower.includes('nonveg') || lower.includes('non-veg')) {
    return false;
  }
  return true; // Default to veg
};

const getItemBadge = (itemName) => {
  const lower = itemName.toLowerCase();
  if (lower.includes('masala') || lower.includes('lemon') || lower.includes('bestseller')) {
    return 'bestseller';
  }
  if (lower.includes('ginger') || lower.includes('popular') || lower.includes('tea')) {
    // Only give ginger or designated tea popular status to match layout
    if (lower.includes('ginger') || lower.includes('popular')) return 'popular';
  }
  return null;
};

const MenuGrid = ({ 
  categories, 
  items, 
  activeCategoryId, 
  setActiveCategoryId, 
  searchQuery, 
  setSearchQuery, 
  addToCart, 
  removeFromCart, 
  cart, 
  isDarkMode, 
  t, 
  getIcon 
}) => {
  const [favorites, setFavorites] = useState({});

  const toggleFavorite = (itemId) => {
    setFavorites(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategoryId === 'all' || item.category_id === activeCategoryId;
    return matchesSearch && matchesCategory;
  });

  const itemsByCategory = categories.reduce((acc, cat) => {
    const catItems = filteredItems.filter(item => item.category_id === cat.id);
    if (catItems.length > 0) acc[cat.id] = catItems;
    return acc;
  }, {});

  return (
    <>
      <nav className="customer-pill-container customer-no-scrollbar" aria-label="Menu categories">
        <button 
          id="category-all-btn"
          className={`customer-pill ${activeCategoryId === 'all' ? 'active' : ''}`} 
          onClick={() => setActiveCategoryId('all')}
        >
          All Items
        </button>
        {categories.map(cat => {
          const catSlug = cat.id.startsWith('cat-') ? cat.id.slice(4) : cat.id;
          return (
            <button 
              key={cat.id} 
              id={`category-cat-${catSlug}-btn`}
              className={`customer-pill ${activeCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              <span style={{ fontSize: '1rem' }}>{getIcon(cat.name, 'category')}</span> {cat.name}
            </button>
          );
        })}
      </nav>

      <div className="customer-search-container">
        <div className="customer-search-bar">
          <Search size={18} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <input 
            id="menu-search-input"
            type="text" 
            placeholder="Search menu items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search menu items"
          />
          <SlidersHorizontal size={18} color="var(--text-secondary)" style={{ flexShrink: 0, cursor: 'pointer' }} />
        </div>
      </div>

      <div className="customer-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.25rem', marginBottom: '1.25rem', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
        <span><strong>{filteredItems.length}</strong> items available</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}></span>
          Menu live
        </span>
      </div>

      <main style={{ padding: '0 0 3rem 0' }}>
        {Object.keys(itemsByCategory).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.25rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>No items found</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Try adjusting your search or category filter</p>
          </div>
        ) : (
          categories.filter(cat => itemsByCategory[cat.id]).map(cat => (
            <div key={cat.id} className="customer-category-section">
              <div className="customer-category-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', marginBottom: '1rem' }}>
                <h2 className="customer-category-title" style={{ fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{cat.name}</h2>
                <div className="customer-category-line" style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0 1rem' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{itemsByCategory[cat.id].length} {itemsByCategory[cat.id].length === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="customer-menu-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1.25rem' }}>
                {itemsByCategory[cat.id].map(item => {
                  const qty = cart[item.id] || 0;
                  const isVeg = isVegItem(item.name);
                  const badge = getItemBadge(item.name);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="customer-item-card"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        backgroundColor: 'var(--card-bg)', 
                        border: '1px solid var(--card-border)', 
                        borderRadius: '20px', 
                        padding: '1rem', 
                        position: 'relative',
                        opacity: item.is_available ? 1 : 0.6 
                      }}
                    >
                      <div 
                        className="customer-item-icon-wrapper"
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '2rem' }}>{getIcon(item.name, 'item')}</span>
                        )}
                        
                        {!item.is_available && (
                          <div className="customer-item-out-overlay">
                            Out of stock
                          </div>
                        )}
                      </div>
                      
                      <div className="customer-item-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <div className="customer-item-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 className="customer-item-title" style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
                        </div>
                        
                        {item.description && (
                          <p className="customer-item-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.3' }}>{item.description}</p>
                        )}

                        <div className="customer-item-badges" style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: '600', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            backgroundColor: isVeg ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                            color: isVeg ? '#10b981' : '#ef4444',
                            border: `1px solid ${isVeg ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}>
                            {isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                          {badge === 'bestseller' && (
                            <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(255, 94, 26, 0.1)', color: 'var(--color-accent)', border: '1px solid rgba(255, 94, 26, 0.2)' }}>
                              Bestseller
                            </span>
                          )}
                          {badge === 'popular' && (
                            <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                              Popular
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="customer-item-actions-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                        <div className="customer-item-price-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="customer-item-price" style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>₹{item.price}</span>
                          <span className="customer-item-per-item" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per item</span>
                        </div>

                        {qty === 0 ? (
                          <button 
                            id={`add-to-cart-${item.id}`}
                            className="customer-card-add-btn" 
                            onClick={() => addToCart(item.id)}
                            disabled={!item.is_available}
                            aria-label={`Add ${item.name} to order`}
                            style={{ padding: '6px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '800' }}
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="customer-card-counter" style={{ padding: '2px 6px', borderRadius: '8px' }}>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              style={{ width: '24px', height: '24px', fontSize: '1rem' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 6px' }}>{qty}</span>
                            <button 
                              onClick={() => addToCart(item.id)}
                              aria-label={`Increase quantity of ${item.name}`}
                              style={{ width: '24px', height: '24px', fontSize: '1rem' }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
};

export default MenuGrid;
