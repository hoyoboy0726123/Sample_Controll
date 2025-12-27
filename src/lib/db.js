// Simple IndexedDB Wrapper with Event Subscription for React
const DB_NAME = 'StockLocalDB';
const DB_VERSION = 4; // Bump to v4 for suggestions

let dbPromise = null;
const listeners = new Set();

const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("Database error: " + event.target.error);

    request.onsuccess = (event) => resolve(event.target.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'pn' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('suggestions')) {
        const store = db.createObjectStore('suggestions', { keyPath: ['type', 'value'] });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
  return dbPromise;
};

const notifyListeners = () => {
  listeners.forEach(cb => cb());
};

export const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const getSuggestions = async (type) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['suggestions'], 'readonly');
    const store = transaction.objectStore('suggestions');
    const index = store.index('type');
    const request = index.getAll(IDBKeyRange.only(type));
    
    request.onsuccess = () => {
      // Return just the values, sorted by last_used desc ideally, but basic is fine
      const results = request.result.map(item => item.value);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveSuggestion = async (type, value) => {
  if (!value) return;
  const db = await openDB();
  // Don't wait for promise, fire and forget
  const transaction = db.transaction(['suggestions'], 'readwrite');
  const store = transaction.objectStore('suggestions');
  store.put({ type, value, last_used: new Date() });
};

export const getUsers = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveUser = async (name) => {
  if (!name) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    store.put({ name, last_seen: new Date() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject();
  });
};

export const getInventory = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['inventory'], 'readonly');
    const store = transaction.objectStore('inventory');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getTransactions = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Descending order
    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < 50) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// --- Actions ---

export const inbound = async (formData, user) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    // Include suggestions in transaction scope? No, keep it separate for performance or just fire distinct calls.
    // Let's keep main transaction critical.
    const transaction = db.transaction(['inventory', 'transactions'], 'readwrite');
    const invStore = transaction.objectStore('inventory');
    const transStore = transaction.objectStore('transactions');

    const getRequest = invStore.get(formData.pn);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      const now = new Date();
      const qty = parseInt(formData.qty);

      let newItem;
      if (item) {
        newItem = {
          ...item,
          total_qty: (item.total_qty || 0) + qty,
          available_qty: (item.available_qty || 0) + qty,
          last_updated: now,
          location: formData.location // Update location
        };
      } else {
        newItem = {
          pn: formData.pn,
          name: formData.name || '未命名樣品',
          total_qty: qty,
          available_qty: qty,
          outbound_qty: 0,
          location: formData.location,
          last_updated: now,
          image: formData.image || null
        };
      }

      invStore.put(newItem);

      // Auto-save suggestions
      saveSuggestion('name', formData.name);
      saveSuggestion('source', formData.source);
      saveSuggestion('location', formData.location);

      transStore.add({
        type: 'IN',
        pn: formData.pn,
        qty: qty,
        operator: user.email || user.name,
        timestamp: now,
        details: {
          source: formData.source,
          status: formData.status,
          location: formData.location
        }
      });
    };

    transaction.oncomplete = () => {
      notifyListeners();
      resolve();
    };
    transaction.onerror = (e) => reject(e.target.error);
  });
};

export const outbound = async (formData, user) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    // Include 'users' in transaction to auto-save borrower
    const transaction = db.transaction(['inventory', 'transactions', 'users'], 'readwrite');
    const invStore = transaction.objectStore('inventory');
    const transStore = transaction.objectStore('transactions');
    const userStore = transaction.objectStore('users');

    const getRequest = invStore.get(formData.pn);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error("找不到此料號"));
        return;
      }

      const qty = parseInt(formData.qty);
      if (item.available_qty < qty) {
        reject(new Error(`庫存不足！可用: ${item.available_qty}`));
        return;
      }

      const newItem = {
        ...item,
        available_qty: item.available_qty - qty,
        outbound_qty: (item.outbound_qty || 0) + qty,
        last_updated: new Date()
      };

      invStore.put(newItem);

      // Auto-register borrower as user
      if (formData.borrower) {
        userStore.put({ name: formData.borrower, last_seen: new Date() });
      }

      transStore.add({
        type: 'OUT',
        pn: formData.pn,
        qty: qty,
        operator: user.email || user.name,
        timestamp: new Date(),
        details: {
          borrower: formData.borrower,
          dueDate: formData.dueDate
        }
      });
    };

    transaction.oncomplete = () => {
      notifyListeners();
      resolve();
    };
    transaction.onerror = (e) => reject(e.target.error || "Transaction error");
  });
};

// --- Backup & Restore ---

export const exportDB = async (includeImages = false) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['inventory', 'transactions'], 'readonly');
    const result = { inventory: [], transactions: [] };

    transaction.objectStore('inventory').getAll().onsuccess = (e) => {
      let data = e.target.result;
      if (!includeImages) {
        // Strip images to keep backup file small
        data = data.map(({ image, ...rest }) => rest);
      }
      result.inventory = data;
    };
    
    transaction.objectStore('transactions').getAll().onsuccess = (e) => {
      result.transactions = e.target.result;
    };
    
    // Attempt to export suggestions if store exists (safe check)
    try {
      if (transaction.objectStoreNames.contains('suggestions')) {
         transaction.objectStore('suggestions').getAll().onsuccess = (e) => {
           result.suggestions = e.target.result;
         };
      }
    } catch(e) {}

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject("Export failed");
  });
};

export const importDB = async (data) => {
  if (!data || !Array.isArray(data.inventory) || !Array.isArray(data.transactions)) {
    throw new Error("無效的備份檔案格式");
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    // Add 'suggestions' to transaction
    const stores = ['inventory', 'transactions'];
    if (db.objectStoreNames.contains('suggestions')) stores.push('suggestions');
    
    const transaction = db.transaction(stores, 'readwrite');
    const invStore = transaction.objectStore('inventory');
    const transStore = transaction.objectStore('transactions');

    // 清空現有資料
    invStore.clear();
    transStore.clear();
    if (transaction.objectStoreNames.contains('suggestions')) {
      transaction.objectStore('suggestions').clear();
    }

    // 寫入新資料
    data.inventory.forEach(item => invStore.put(item));
    data.transactions.forEach(item => transStore.put(item));
    
    if (data.suggestions && transaction.objectStoreNames.contains('suggestions')) {
      const suggStore = transaction.objectStore('suggestions');
      data.suggestions.forEach(item => suggStore.put(item));
    }

    transaction.oncomplete = () => {
      notifyListeners();
      resolve();
    };
    transaction.onerror = (e) => reject(e.target.error || "Import failed");
  });
};
export const returnItem = async (formData, user) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['inventory', 'transactions'], 'readwrite');
    const invStore = transaction.objectStore('inventory');
    const transStore = transaction.objectStore('transactions');

    const getRequest = invStore.get(formData.pn);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error("找不到此料號"));
        return;
      }

      const qty = parseInt(formData.qty);
      if ((item.outbound_qty || 0) < qty) {
        reject(new Error(`歸還數量大於系統出庫數量 (${item.outbound_qty || 0})`));
        return;
      }

      const newItem = {
        ...item,
        available_qty: (item.available_qty || 0) + qty,
        outbound_qty: (item.outbound_qty || 0) - qty,
        last_updated: new Date()
      };

      invStore.put(newItem);

      transStore.add({
        type: 'RETURN',
        pn: formData.pn,
        qty: qty,
        operator: user.email || user.name,
        timestamp: new Date(),
        details: {
          condition: formData.condition,
          notes: formData.notes
        }
      });
    };

    transaction.oncomplete = () => {
      notifyListeners();
      resolve();
    };
    transaction.onerror = (e) => reject(e.target.error || "Transaction error");
  });
};

export const deleteItem = async (pn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['inventory'], 'readwrite');
    const store = transaction.objectStore('inventory');
    
    store.delete(pn);

    transaction.oncomplete = () => {
      notifyListeners();
      resolve();
    };
    transaction.onerror = (e) => reject(e.target.error);
  });
};

export const deleteTransaction = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');
    
    store.delete(id);

    transaction.oncomplete = () => {
      notifyListeners();
      resolve();
    };
    transaction.onerror = (e) => reject(e.target.error);
  });
};
