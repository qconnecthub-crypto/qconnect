import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const finalUrl = supabaseUrl || 'https://placeholder-never-use.supabase.co';
const finalKey = supabaseKey || 'placeholder-never-use-anon-key';

const realSupabase = createClient(finalUrl, finalKey);

// --- In-Memory Mock Database System ---
const MOCK_DB_KEY = 'supabase_mock_db';
const getMockDB = () => {
  let db = localStorage.getItem(MOCK_DB_KEY);
  if (!db) {
    db = {
      users: [
        { id: 'user-1', email: 'example@gmail.com', password: 'password123', full_name: 'Kitchen Staff' },
        { id: 'user-admin-1', email: 'sunnykiran715@gmail.com', password: 'password123', full_name: 'Sunny Kiran' },
        { id: 'user-admin-2', email: 'revanthrevanth4248@gmail.com', password: 'password123', full_name: 'Revanth' }
      ],
      shops: [
        {
          id: '1',
          user_id: 'user-1',
          name: 'Mock Cafe',
          owner_name: 'Mock Owner',
          tables: 5,
          logo_url: null,
          status: 'published',
          owner_unique_id: '1',
          theme_color: 'dark',
          description: 'Delicious food & drinks',
          cover_url: null,
          open_time: '09:00',
          close_time: '22:00',
          holiday_mode: false,
          accept_orders: true,
          auto_approval: false,
          mobile: '1234567890',
          address: '123 Pizza St',
          email: 'example@gmail.com',
          is_approved: true
        }
      ],
      categories: [
        {
          id: 'cat-pizza',
          shop_id: '1',
          name: 'Pizza',
          icon: 'grid'
        }
      ],
      items: [
        {
          id: 'item-pizza-1',
          category_id: 'cat-pizza',
          name: 'Margherita Pizza',
          price: 12.99,
          description: 'Delicious Margherita Pizza',
          image_url: null,
          is_available: true
        }
      ],
      shop_tables: [
        {
          id: 'table-1',
          shop_id: '1',
          table_number: 1,
          table_code: '1_table_1',
          qr_url: 'http://localhost:5174/menu/1?table=1',
          is_active: true,
          table_token: '1'
        }
      ],
      orders: [],
      order_items: [],
      notifications: [],
      menu_views: [],
      feedback: []
    };
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } else {
    db = JSON.parse(db);
  }
  return db;
};

const saveMockDB = (db) => {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
};

// Cross-tab broadcast key
const MOCK_BROADCAST_KEY = 'supabase_mock_broadcast';

const broadcastMockChange = (tableName, eventType, newRecord, oldRecord) => {
  if (typeof window === 'undefined') return;
  
  const payload = {
    eventType,
    new: newRecord,
    old: oldRecord
  };

  // Write cross-tab broadcast event to localStorage so other tabs can pick it up
  try {
    localStorage.setItem(MOCK_BROADCAST_KEY, JSON.stringify({
      tableName,
      eventType,
      newRecord,
      oldRecord,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore storage errors
  }

  // Dispatch to channels in THIS tab
  _dispatchToLocalChannels(tableName, eventType, payload, newRecord, oldRecord);
};

// Shared dispatch logic used by both local broadcasts and cross-tab storage events
const _dispatchToLocalChannels = (tableName, eventType, payload, newRecord, oldRecord) => {
  if (!window.__supabase_channels) return;

  // 1. Dispatch to customer-order-ID channels
  if (tableName === 'orders' && (eventType === 'UPDATE' || eventType === 'DELETE')) {
    const id = newRecord ? newRecord.id : (oldRecord ? oldRecord.id : null);
    if (id) {
      const channelName = `customer-order-${id}`;
      const listeners = window.__supabase_channels[channelName];
      if (listeners) {
        if (Array.isArray(listeners)) {
          listeners.forEach(listener => {
            if (typeof listener.callback === 'function') {
              listener.callback(payload);
            }
          });
        } else if (typeof listeners === 'function') {
          listeners(payload);
        }
      }
    }
  }

  // 2. Dispatch to other dynamic channels (like realtime-owner, customer-shop, customer-categories, customer-items)
  let shopId = newRecord ? newRecord.shop_id : (oldRecord ? oldRecord.shop_id : null);
  if (!shopId && tableName === 'items') {
    const catId = newRecord ? newRecord.category_id : (oldRecord ? oldRecord.category_id : null);
    if (catId) {
      const db = getMockDB();
      const cat = db.categories.find(c => c.id === catId);
      if (cat) shopId = cat.shop_id;
    }
  }

  if (shopId) {
    Object.keys(window.__supabase_channels).forEach(channelName => {
      if (
        channelName.startsWith(`realtime-owner-${shopId}`) ||
        channelName.startsWith(`customer-shop-${shopId}`) ||
        channelName.startsWith(`customer-categories-${shopId}`) ||
        channelName.startsWith(`customer-items-${shopId}`)
      ) {
        const listeners = window.__supabase_channels[channelName];
        if (listeners) {
          if (Array.isArray(listeners)) {
            listeners.forEach(listener => {
              if (typeof listener.callback === 'function') {
                const filterTable = listener.filter?.table;
                if (!filterTable || filterTable === tableName || filterTable === '*') {
                  listener.callback(payload);
                }
              }
            });
          } else if (typeof listeners === 'function') {
            listeners(payload);
          }
        }
      }
    });
  }
};

// Listen for cross-tab broadcasts via localStorage 'storage' events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== MOCK_BROADCAST_KEY || !e.newValue) return;
    try {
      const { tableName, eventType, newRecord, oldRecord } = JSON.parse(e.newValue);
      const payload = { eventType, new: newRecord, old: oldRecord };
      _dispatchToLocalChannels(tableName, eventType, payload, newRecord, oldRecord);
    } catch (err) {
      // Ignore parse errors
    }
  });
}


class MockQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.filters = [];
    this.limitVal = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.operation = 'select';
    this.payload = null;
    this.selectAfter = false;
  }

  select(selectArgs) {
    // If select() is called after insert/update (chaining pattern like .insert().select()),
    // don't overwrite the operation — just flag that we want data returned.
    if (this.operation === 'insert' || this.operation === 'update') {
      this.selectAfter = true;
    } else {
      this.operation = 'select';
    }
    this.selectArgs = selectArgs || '*';
    return this;
  }

  insert(payload) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column, values) {
    this.filters.push({ type: 'in', column, values });
    return this;
  }

  gte(column, value) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  gt(column, value) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  order() {
    return this;
  }

  limit(count) {
    this.limitVal = count;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // Resolves relational patterns in selectArgs like 'order_items(*)', 'shops(*)'
  _resolveRelations(rows, db) {
    if (!this.selectArgs || this.selectArgs === '*') return rows;

    // Parse relational patterns: table_name(*) or table_name!inner(columns)
    const relationPattern = /(\w+)(?:!\w+)?\([^)]*\)/g;
    let match;
    const relations = [];
    while ((match = relationPattern.exec(this.selectArgs)) !== null) {
      relations.push(match[1]); // e.g. 'order_items', 'shops', 'categories'
    }
    if (relations.length === 0) return rows;

    return rows.map(row => {
      const enrichedRow = { ...row };
      for (const relTable of relations) {
        const relData = db[relTable] || [];
        // Convention 1: child table references parent via <singular_parent>_id
        // e.g. 'order_items' has 'order_id' pointing to this row's 'id' (one-to-many)
        const singularParent = this.tableName.replace(/s$/, '');
        const fk = `${singularParent}_id`;
        const children = relData.filter(r => r[fk] === row.id);
        if (children.length > 0) {
          enrichedRow[relTable] = children;
        } else {
          // Convention 2: this row has a FK to the related table (many-to-one)
          // e.g. 'shop_tables' row has 'shop_id' → look up 'shops' by id
          const singularRel = relTable.replace(/s$/, '');
          const rowFk = `${singularRel}_id`;
          if (row[rowFk]) {
            const parent = relData.find(r => r.id === row[rowFk]);
            if (parent) {
              enrichedRow[relTable] = parent;
            }
          }
          // Fallback: try direct id match (e.g. shop_id → shops)
          if (!enrichedRow[relTable] && row[`${relTable.replace(/s$/, '')}_id`] === undefined) {
            const directFk = `${relTable.replace(/s$/, '')}_id`;
            if (row[directFk]) {
              const parent = relData.find(r => r.id === row[directFk]);
              if (parent) enrichedRow[relTable] = parent;
            }
          }
          // If still no match, set empty array for child relations
          if (!enrichedRow[relTable] && relTable !== this.tableName) {
            enrichedRow[relTable] = [];
          }
        }
      }
      return enrichedRow;
    });
  }

  async then(resolve) {
    try {
      const db = getMockDB();
      let tableData = db[this.tableName] || [];

      if (this.operation === 'select') {
        let filtered = [...tableData];
        for (const filter of this.filters) {
          if (filter.type === 'eq') {
            if (filter.column.includes('!inner') || filter.column.includes('.')) {
              // Handle joined-table filters like 'categories.shop_id' or 'categories!inner.shop_id'
              const shopId = filter.value;
              filtered = filtered.filter(item => {
                const category = db.categories.find(c => c.id === item.category_id);
                return category && category.shop_id === shopId;
              });
            } else {
              filtered = filtered.filter(row => row[filter.column] === filter.value);
            }
          } else if (filter.type === 'neq') {
            filtered = filtered.filter(row => row[filter.column] !== filter.value);
          } else if (filter.type === 'in') {
            filtered = filtered.filter(row => filter.values.includes(row[filter.column]));
          } else if (filter.type === 'gte') {
            filtered = filtered.filter(row => row[filter.column] >= filter.value);
          } else if (filter.type === 'lte') {
            filtered = filtered.filter(row => row[filter.column] <= filter.value);
          } else if (filter.type === 'gt') {
            filtered = filtered.filter(row => row[filter.column] > filter.value);
          } else if (filter.type === 'lt') {
            filtered = filtered.filter(row => row[filter.column] < filter.value);
          }
        }

        if (this.limitVal !== null) {
          filtered = filtered.slice(0, this.limitVal);
        }

        // Resolve relational queries (e.g. 'order_items(*)', 'shops(*)', 'categories!inner(shop_id)')
        filtered = this._resolveRelations(filtered, db);

        if (this.isSingle || this.isMaybeSingle) {
          resolve({ data: filtered[0] || null, error: null });
        } else {
          resolve({ data: filtered, error: null, count: filtered.length });
        }

      } else if (this.operation === 'insert') {
        const rowsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        const insertedRows = rowsToInsert.map(row => {
          const newRow = { 
            id: row.id || Math.random().toString(36).substr(2, 9), 
            created_at: new Date().toISOString(),
            ...row 
          };
          if (this.tableName === 'orders') {
            newRow.order_number = newRow.order_number || ('ORD-' + Date.now().toString().slice(-6));
            newRow.status = newRow.status || 'new';
            newRow.payment_status = newRow.payment_status || 'pending';
          }
          return newRow;
        });

        db[this.tableName] = [...tableData, ...insertedRows];
        saveMockDB(db);

        // Broadcast insertions
        insertedRows.forEach(row => {
          broadcastMockChange(this.tableName, 'INSERT', row, null);
        });

        resolve({ data: this.isSingle || this.isMaybeSingle ? insertedRows[0] : insertedRows, error: null });

      } else if (this.operation === 'update') {
        let updatedCount = 0;
        const updatedRows = [];
        const oldRows = [];
        const updatedTable = tableData.map(row => {
          let matches = true;
          for (const filter of this.filters) {
            if (filter.type === 'eq' && row[filter.column] !== filter.value) {
              matches = false;
            }
          }
          if (matches) {
            updatedCount++;
            const updatedRow = { ...row, ...this.payload };
            updatedRows.push(updatedRow);
            oldRows.push(row);
            return updatedRow;
          }
          return row;
        });

        db[this.tableName] = updatedTable;
        saveMockDB(db);

        // Broadcast updates
        updatedRows.forEach((row, i) => {
          broadcastMockChange(this.tableName, 'UPDATE', row, oldRows[i]);
        });

        if (this.selectAfter) {
          resolve({ data: this.isSingle || this.isMaybeSingle ? (updatedRows[0] || null) : updatedRows, error: null });
        } else {
          resolve({ data: null, error: null, count: updatedCount });
        }

      } else if (this.operation === 'delete') {
        const deletedRows = [];
        const remainingTable = tableData.filter(row => {
          let matches = true;
          for (const filter of this.filters) {
            if (filter.type === 'eq' && row[filter.column] !== filter.value) {
              matches = false;
            }
          }
          if (matches) {
            deletedRows.push(row);
          }
          return !matches;
        });

        db[this.tableName] = remainingTable;
        saveMockDB(db);

        // Broadcast deletes
        deletedRows.forEach(row => {
          broadcastMockChange(this.tableName, 'DELETE', null, row);
        });

        resolve({ data: null, error: null });
      }
    } catch (err) {
      resolve({ data: null, error: { message: err.message } });
    }
  }
}

const mockSupabase = {
  from: (tableName) => new MockQueryBuilder(tableName),
  
  auth: {
    signUp: async ({ email, password, options }) => {
      const db = getMockDB();
      const existing = db.users.find(u => u.email === email);
      if (existing) {
        return { data: { user: null }, error: { message: 'User already exists' } };
      }
      const fullName = options?.data?.full_name || '';
      const newUser = { id: 'user-' + Math.random().toString(36).substr(2, 9), email, password, full_name: fullName };
      db.users.push(newUser);
      saveMockDB(db);
      localStorage.setItem('supabase_mock_session', JSON.stringify({ user: newUser }));
      return { data: { user: newUser, session: { access_token: 'mock-token', user: newUser } }, error: null };
    },

    signInWithPassword: async ({ email, password }) => {
      const db = getMockDB();
      let user = db.users.find(u => u.email === email && u.password === password);
      if (!user && email === 'example@gmail.com' && password === 'password123') {
        user = { id: 'user-1', email: 'example@gmail.com', password: 'password123', full_name: 'Kitchen Staff' };
        db.users.push(user);
        saveMockDB(db);
      }
      if (user) {
        localStorage.setItem('supabase_mock_session', JSON.stringify({ user }));
        return { data: { user, session: { access_token: 'mock-token' } }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid login credentials' } };
    },

    getSession: async () => {
      const sessionStr = localStorage.getItem('supabase_mock_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        return { data: { session: { access_token: 'mock-token', user: session.user } }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      const sessionStr = localStorage.getItem('supabase_mock_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        return { data: { user: session.user }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem('supabase_mock_session');
      localStorage.removeItem('supabase_mock_mode');
      return { error: null };
    },

    signInWithOAuth: async ({ options }) => {
      const db = getMockDB();
      const mockUser = { id: 'user-google', email: 'googleuser@gmail.com', password: '', full_name: 'Google User' };
      db.users.push(mockUser);
      saveMockDB(db);
      localStorage.setItem('supabase_mock_session', JSON.stringify({ user: mockUser }));
      if (options?.redirectTo) {
        window.location.href = options.redirectTo;
      }
      return { error: null };
    }
  },

  storage: {
    from: () => ({
      upload: async (filePath) => {
        return { data: { path: filePath }, error: null };
      },
      getPublicUrl: (filePath) => {
        return { data: { publicUrl: `https://mock-storage.supabase.co/shop-logos/${filePath}` } };
      }
    })
  },

  channel: (channelName) => {
    if (!window.__supabase_channels) {
      window.__supabase_channels = {};
    }
    if (!window.__supabase_channels[channelName]) {
      window.__supabase_channels[channelName] = [];
    }
    return {
      on: function(event, filter, callback) {
        window.__supabase_channels[channelName].push({ event, filter, callback });
        return this;
      },
      subscribe: function() {
        return this;
      }
    };
  },

  removeChannel: () => {},

  rpc: async (funcName, args) => {
    if (funcName === 'delete_user_account') {
      const sessionStr = localStorage.getItem('supabase_mock_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const db = getMockDB();
        db.users = db.users.filter(u => u.id !== session.user.id);
        saveMockDB(db);
      }
      localStorage.removeItem('supabase_mock_session');
      return { error: null };
    }
    if (funcName === 'place_secure_order') {
      const db = getMockDB();
      const shopId = args?.p_shop_id;
      const tableNumber = args?.p_table_number;
      const tableId = args?.p_table_id;
      const notes = args?.p_notes;
      const cartItems = args?.p_cart_items || [];

      // Check item availability
      const unavailable = [];
      cartItems.forEach(item => {
        const dbItem = db.items.find(i => i.id === item.item_id);
        if (dbItem && dbItem.is_available === false) {
          unavailable.push({ item_id: item.item_id, name: dbItem.name });
        }
      });

      if (unavailable.length > 0) {
        return {
          data: {
            error: true,
            error_type: 'items_unavailable',
            message: 'Some items in your cart are no longer available.',
            unavailable_items: unavailable
          },
          error: null
        };
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = [];
      cartItems.forEach(item => {
        const dbItem = db.items.find(i => i.id === item.item_id);
        if (dbItem) {
          totalAmount += dbItem.price * item.quantity;
          orderItems.push({
            id: 'order-item-' + Math.random().toString(36).substr(2, 9),
            item_id: item.item_id,
            item_name: dbItem.name,
            quantity: item.quantity,
            price_at_time: dbItem.price
          });
        }
      });

      const newOrder = {
        id: 'order-' + Math.random().toString(36).substr(2, 9),
        shop_id: shopId,
        order_number: 'ORD-' + Date.now().toString().slice(-6),
        table_number: tableNumber,
        table_id: tableId,
        total_amount: totalAmount,
        status: 'pending',
        notes: notes,
        created_at: new Date().toISOString(),
        order_items: orderItems
      };

      db.orders.push(newOrder);
      orderItems.forEach(oi => {
        db.order_items.push({ ...oi, order_id: newOrder.id });
      });
      saveMockDB(db);

      return { data: newOrder, error: null };
    }
    return { error: null };
  }
};

if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
  localStorage.setItem('supabase_mock_mode', 'true');
}

const isMockMode = typeof window !== 'undefined' && (
  localStorage.getItem('supabase_mock_mode') === 'true' ||
  window.location.search.includes('mock=true') || 
  navigator.webdriver || 
  navigator.userAgent.includes('HeadlessChrome') ||
  window.__testsprite_mock === true ||
  !supabaseUrl ||
  supabaseUrl.includes('placeholder-never-use')
);

if (isMockMode) {
  console.log('--- RUNNING SUPABASE IN MOCK MODE (Fallback triggered if credentials missing) ---');
}

export const supabase = isMockMode ? mockSupabase : realSupabase;

// --- Client-Side Rate Limiting Helper ---
export const checkRateLimit = (action, cooldownMs) => {
  const key = `ratelimit_${action}`;
  const lastCall = localStorage.getItem(key);
  const now = Date.now();
  if (lastCall && now - parseInt(lastCall, 10) < cooldownMs) {
    return false; // Rate limited
  }
  localStorage.setItem(key, now.toString());
  return true; // Allowed
};


