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
          className={`customer-pill ${activeCategoryId === 'all' ? 'active' : ''}`} 
          onClick={() => setActiveCategoryId('all')}
        >
          All
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id} 
            className={`customer-pill ${activeCategoryId === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategoryId(cat.id)}
          >
            <span style={{ fontSize: '1rem' }}>{getIcon(cat.name, 'category')}</span> {cat.name}
          </button>
        ))}
      </nav>

      <div className="customer-search-container">
        <div className="customer-search-bar">
          <Search size={18} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="Search for dishes, tea, coffee..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search menu items"
          />
          <SlidersHorizontal size={18} color="var(--text-secondary)" style={{ flexShrink: 0, cursor: 'pointer' }} />
        </div>
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
              <div className="customer-category-header">
                <h2 className="customer-category-title">{cat.name}</h2>
                <div className="customer-category-line" />
              </div>
              <div className="customer-menu-grid">
                {itemsByCategory[cat.id].map(item => {
                  const qty = cart[item.id] || 0;
                  const isVeg = isVegItem(item.name);
                  const badge = getItemBadge(item.name);
                  const isFav = !!favorites[item.id];
                  
                  return (
                    <div 
                      key={item.id} 
                      className="customer-item-card"
                      style={{ opacity: item.is_available ? 1 : 0.6 }}
                    >
                      <div className="customer-item-icon-wrapper">
                        {/* Bestseller / Popular Badge overlay */}
                        {badge === 'bestseller' && (
                          <div className="customer-card-badge customer-card-badge-bestseller">
                            ★ Bestseller
                          </div>
                        )}
                        {badge === 'popular' && (
                          <div className="customer-card-badge customer-card-badge-popular">
                            ✦ Popular
                          </div>
                        )}

                        {/* Heart Wishlist Overlay */}
                        <button 
                          className={`customer-card-heart ${isFav ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart size={15} fill={isFav ? "#ef4444" : "transparent"} color={isFav ? "#ef4444" : "currentColor"} />
                        </button>

                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} loading="lazy" />
                        ) : (
                          <span>{getIcon(item.name, 'item')}</span>
                        )}
                        
                        {!item.is_available && (
                          <div className="customer-item-out-overlay">
                            Out of stock
                          </div>
                        )}
                      </div>
                      
                      <div className="customer-item-content">
                        <div className="customer-item-header">
                          <div className={`customer-veg-indicator ${isVeg ? 'veg' : 'non-veg'}`}>
                            <div className="customer-veg-dot"></div>
                          </div>
                          <h3 className="customer-item-title" title={item.name}>{item.name}</h3>
                        </div>
                        
                        {item.description && (
                          <p className="customer-item-desc">{item.description}</p>
                        )}
                        
                        <div className="customer-price-row">
                          <span className="customer-item-price">₹{item.price}</span>
                          {qty === 0 && (
                            <button 
                              className="customer-card-add-btn" 
                              onClick={() => addToCart(item.id)}
                              disabled={!item.is_available}
                              aria-label={`Add ${item.name} to order`}
                            >
                              + Add
                            </button>
                          )}
                        </div>

                        {qty > 0 && (
                          <div className="customer-card-counter-container">
                            <div className="customer-card-counter">
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                -
                              </button>
                              <span>{qty}</span>
                              <button 
                                onClick={() => addToCart(item.id)}
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                +
                              </button>
                            </div>
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
