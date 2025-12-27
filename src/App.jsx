import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  PackagePlus, 
  PackageMinus, 
  RotateCcw, 
  Search, 
  History, 
  LogOut, 
  Box, 
  AlertCircle,
  CheckCircle2,
  User,
  ArrowRightLeft,
  CloudOff,
  Download,
  Upload,
  Camera,
  Image as ImageIcon,
  X,
  Trash2,
  Menu // Added Menu icon
} from 'lucide-react';
import { getInventory, getTransactions, inbound, outbound, returnItem, subscribe, exportDB, importDB, getUsers, saveUser, getSuggestions, deleteItem, deleteTransaction } from './lib/db';
import { compressImage } from './lib/image';

const ADMIN_NAME = 'admin';

// --- Helper Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

// Autocomplete Input Component
const AutocompleteInput = ({ label, value, onChange, placeholder, type = "text", required = false, suggestionType }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (suggestionType) {
      getSuggestions(suggestionType).then(setSuggestions).catch(console.error);
    }
  }, [suggestionType]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(e);
    
    if (val.length > 0 && suggestions.length > 0) {
      const matches = suggestions.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setFiltered(matches);
      setShow(true);
    } else {
      setShow(false);
    }
  };

  const handleSelect = (val) => {
    // Create a synthetic event to pass to onChange
    onChange({ target: { value: val } });
    setShow(false);
  };

  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {show && filtered.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto top-[72px]">
          {filtered.map(item => (
            <div 
              key={item}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 text-sm"
              onClick={() => handleSelect(item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Button = ({ children, onClick, variant = "primary", disabled = false, type = "button", className = "" }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
    ghost: "text-slate-300 hover:bg-slate-800 hover:text-white"
  };
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", required = false, readOnly = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      readOnly={readOnly}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
    />
  </div>
);

const Select = ({ label, value, onChange, options, required = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    '新品': 'bg-green-100 text-green-800',
    '可用': 'bg-blue-100 text-blue-800',
    '待檢': 'bg-yellow-100 text-yellow-800',
    '損壞': 'bg-red-100 text-red-800',
    '出庫中': 'bg-purple-100 text-purple-800',
    'IN': 'bg-green-100 text-green-800',
    'OUT': 'bg-orange-100 text-orange-800',
    'RETURN': 'bg-blue-100 text-blue-800',
  };
  const label = status === 'IN' ? '入庫' : status === 'OUT' ? '出庫' : status === 'RETURN' ? '歸還' : status;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in-up`}>
      {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      {message}
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginName, setLoginName] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [toast, setToast] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State
  const fileInputRef = useRef(null);

  // Auth Simulation
  useEffect(() => {
    const storedUser = localStorage.getItem('local_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); 
    if (!loginName.trim()) return;
    const u = { name: loginName, email: loginName, uid: 'local-' + Date.now() };
    localStorage.setItem('local_user', JSON.stringify(u));
    await saveUser(loginName); 
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('local_user');
    setUser(null);
    setLoginName('');
  };

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  // Data Fetching
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const inv = await getInventory();
        const trans = await getTransactions();
        setInventory(inv);
        setTransactions(trans);
      } catch (error) {
        console.error("Data fetch error:", error);
      }
    };

    fetchData();
    const unsubscribe = subscribe(fetchData);

    return () => unsubscribe();
  }, [user]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // --- Backup & Restore Handlers ---

  const handleExport = async () => {
    try {
      const includeImages = window.confirm('備份選項：\n\n是否要包含產品照片？\n(包含照片會增加檔案大小，備份/還原時間會較長)');
      const data = await exportDB(includeImages);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = includeImages ? '_with_images' : '';
      a.download = `stock_backup${suffix}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('資料備份已下載');
    } catch (e) {
      showToast('備份失敗: ' + e, 'error');
    }
  };

  const handleImportClick = () => {
    if (window.confirm('警告：還原資料將會「覆蓋」目前所有的庫存與記錄，確定要繼續嗎？')) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        await importDB(data);
        showToast('資料還原成功！系統將重整...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        showToast('還原失敗：檔案格式錯誤', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // --- Actions ---

  const handleInbound = async (formData) => {
    if (!user) return;
    try {
      await inbound(formData, user);
      showToast('入庫成功');
      setCurrentView('dashboard');
    } catch (e) {
      console.error(e);
      showToast('入庫失敗: ' + e.message, 'error');
    }
  };

  const handleOutbound = async (formData) => {
    if (!user) return;
    try {
      await outbound(formData, user);
      showToast('出庫成功');
      setCurrentView('dashboard');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleReturn = async (formData) => {
    if (!user) return;
    try {
      await returnItem(formData, user);
      showToast('歸還成功');
      setCurrentView('dashboard');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // --- Login Screen ---
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm border-t-4 border-gray-600">
          <div className="flex justify-center mb-4">
            <CloudOff size={48} className="text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">樣品管理系統</h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            Local Version (IndexedDB)<br/>
            資料僅儲存於本機瀏覽器
          </p>
          <form onSubmit={handleLogin}>
            <Input 
              label="使用者名稱" 
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="請輸入姓名" 
              required 
            />
            <Button type="submit" className="w-full bg-gray-700 hover:bg-gray-800">
              進入系統
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;

  // --- Main Layout ---
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Hidden File Input for Restore */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center px-4 z-40 shadow-md">
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-slate-800 rounded-md">
          <Menu size={24} />
        </button>
        <span className="ml-3 font-bold text-lg">樣品管理 (Local)</span>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <CloudOff className="text-gray-400" />
          <span className="font-bold text-xl">樣品管理 (Local)</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden ml-auto text-slate-400">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="庫存概覽" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <div className="pt-4 pb-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">操作</div>
          <NavItem icon={<PackagePlus size={20}/>} label="入庫作業" active={currentView === 'inbound'} onClick={() => setCurrentView('inbound')} />
          <NavItem icon={<PackageMinus size={20}/>} label="出庫/借用" active={currentView === 'outbound'} onClick={() => setCurrentView('outbound')} />
          <NavItem icon={<RotateCcw size={20}/>} label="歸還作業" active={currentView === 'return'} onClick={() => setCurrentView('return')} />
          <div className="pt-4 pb-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">資料</div>
          <NavItem icon={<Search size={20}/>} label="庫存查詢" active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} />
          <NavItem icon={<History size={20}/>} label="歷史記錄" active={currentView === 'history'} onClick={() => setCurrentView('history')} />
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <div className="flex items-center gap-3 mb-3 text-slate-300 text-sm">
            <User size={16} />
            <span>ID: {user.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
             <Button variant="ghost" className="text-xs flex flex-col items-center gap-1 py-2 h-auto" onClick={handleExport}>
               <Download size={16} />
               備份
             </Button>
             <Button variant="ghost" className="text-xs flex flex-col items-center gap-1 py-2 h-auto" onClick={handleImportClick}>
               <Upload size={16} />
               還原
             </Button>
          </div>

          <button className="flex items-center gap-2 text-red-300 hover:text-red-100 transition-colors text-sm w-full pt-2 border-t border-slate-800" onClick={handleLogout}>
            <LogOut size={16} /> 登出
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 lg:p-8 pt-20 lg:pt-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {currentView === 'dashboard' && <DashboardView inventory={inventory} transactions={transactions} onViewChange={setCurrentView} />}
          {currentView === 'inbound' && <InboundForm user={user} onSubmit={handleInbound} onCancel={() => setCurrentView('dashboard')} />}
          {currentView === 'outbound' && <OutboundForm user={user} inventory={inventory} onSubmit={handleOutbound} onCancel={() => setCurrentView('dashboard')} />}
          {currentView === 'return' && <ReturnForm user={user} inventory={inventory} onSubmit={handleReturn} onCancel={() => setCurrentView('dashboard')} />}
          {currentView === 'inventory' && <InventoryList user={user} inventory={inventory} onViewHistory={() => setCurrentView('history')} />}
          {currentView === 'history' && <HistoryLog transactions={transactions} user={user} />}
        </div>
      </main>
    </div>
  );
}

// --- Sub-Components (Reused) ---

const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const DashboardView = ({ inventory, transactions, onViewChange }) => {
  const stats = useMemo(() => {
    return {
      totalItems: inventory.reduce((acc, curr) => acc + (curr.total_qty || 0), 0),
      totalOut: inventory.reduce((acc, curr) => acc + (curr.outbound_qty || 0), 0),
      lowStock: inventory.filter(i => i.available_qty < 5).length
    };
  }, [inventory]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">儀表板 (Local)</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">總庫存數量</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalItems}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Box size={24} /></div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-orange-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">當前借出總數</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalOut}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-full text-orange-600"><ArrowRightLeft size={24} /></div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">低庫存品項 (&lt;5)</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.lowStock}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600"><AlertCircle size={24} /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onViewChange('inbound')} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group">
              <PackagePlus size={32} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-700">入庫</span>
            </button>
            <button onClick={() => onViewChange('outbound')} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-all group">
              <PackageMinus size={32} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-700">出庫</span>
            </button>
            <button onClick={() => onViewChange('return')} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition-all group">
              <RotateCcw size={32} className="text-green-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-700">歸還</span>
            </button>
            <button onClick={() => onViewChange('inventory')} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all group">
              <Search size={32} className="text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-700">查詢</span>
            </button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <History size={18} /> 最近活動
          </h3>
          <div className="overflow-y-auto max-h-[250px] pr-2">
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-4">暫無記錄</p>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={t.type} />
                      <div>
                        <p className="font-semibold text-gray-800">{t.pn}</p>
                        <p className="text-xs text-gray-500">
                          {t.timestamp ? t.timestamp.toLocaleString('zh-TW') : '剛剛'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold block">{t.qty} 個</span>
                      <span className="text-xs text-gray-500">User: {t.operator}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const InboundForm = ({ user, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    pn: '',
    name: '',
    qty: '',
    source: '',
    status: '新品',
    location: '',
    image: null // New field
  });

  const photoInputRef = useRef(null);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm({ ...form, image: compressed });
    } catch (err) {
      console.error(err);
      alert("圖片處理失敗");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PackagePlus className="text-blue-600" /> 入庫作業
        </h2>
        <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-2">
          <User size={14} />
          操作人員: <span className="font-semibold">{user?.name}</span>
        </div>
      </div>
      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col items-center mb-4 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              {form.image ? (
                <div className="relative">
                  <img src={form.image} alt="Preview" className="h-40 w-40 object-cover rounded-lg shadow-md" />
                  <button 
                    type="button"
                    onClick={() => setForm({...form, image: null})}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100">
                    <Camera size={32} />
                  </div>
                  <span className="text-sm font-medium">點擊拍照或上傳產品照</span>
                </button>
              )}
              <input 
                type="file" 
                ref={photoInputRef} 
                onChange={handleCapture} 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
              />
            </div>

            <Input 
              label="料號 (P/N)" 
              required 
              value={form.pn} 
              onChange={e => setForm({...form, pn: e.target.value})} 
              placeholder="例如: S-2023-001"
            />
            <AutocompleteInput 
              label="樣品名稱 (選填)" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="例如: 主機板 V1.0"
              suggestionType="name"
            />
            <Input 
              label="入庫數量" 
              type="number" 
              required 
              value={form.qty} 
              onChange={e => setForm({...form, qty: e.target.value})} 
            />
            <AutocompleteInput 
              label="儲存地點" 
              required 
              value={form.location} 
              onChange={e => setForm({...form, location: e.target.value})} 
              placeholder="例如: 櫃位 A-01"
              suggestionType="location"
            />
            <AutocompleteInput 
              label="來源廠商/部門" 
              value={form.source} 
              onChange={e => setForm({...form, source: e.target.value})} 
              suggestionType="source"
            />
            <Select 
              label="初始狀態"
              value={form.status}
              onChange={e => setForm({...form, status: e.target.value})}
              options={[
                { value: '新品', label: '新品' },
                { value: '待檢', label: '待檢' },
                { value: '返修', label: '返修回廠' }
              ]}
            />
          </div>
          <div className="mt-6 flex gap-3 justify-end">
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button type="submit">確認入庫</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const OutboundForm = ({ user, inventory, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    pn: '',
    qty: '',
    borrower: '',
    dueDate: ''
  });
  
  const [selectedItem, setSelectedItem] = useState(null);
  
  // P/N Autocomplete States
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Borrower Autocomplete States
  const [allUsers, setAllUsers] = useState([]);
  const [borrowerSuggestions, setBorrowerSuggestions] = useState([]);
  const [showBorrowerSuggestions, setShowBorrowerSuggestions] = useState(false);

  // Load Users
  useEffect(() => {
    getUsers().then(setAllUsers).catch(console.error);
  }, []);

  // Auto-fill available qty check
  useEffect(() => {
    const item = inventory.find(i => i.pn === form.pn);
    setSelectedItem(item || null);
  }, [form.pn, inventory]);

  const handlePnChange = (e) => {
    const value = e.target.value;
    setForm({...form, pn: value});
    
    if (value.length > 0) {
      const matches = inventory.filter(item => 
        item.pn.toLowerCase().includes(value.toLowerCase()) || 
        (item.name && item.name.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5); 
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setForm({...form, pn: item.pn});
    setShowSuggestions(false);
  };

  const handleBorrowerChange = (e) => {
    const value = e.target.value;
    setForm({...form, borrower: value});

    if (value.length > 0) {
      const matches = allUsers.filter(u => 
        u.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setBorrowerSuggestions(matches);
      setShowBorrowerSuggestions(true);
    } else {
      setBorrowerSuggestions([]);
      setShowBorrowerSuggestions(false);
    }
  };

  const handleSelectBorrower = (name) => {
    setForm({...form, borrower: name});
    setShowBorrowerSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PackageMinus className="text-orange-600" /> 出庫/借用作業
        </h2>
        <div className="text-sm bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-2">
          <User size={14} />
          操作人員: <span className="font-semibold">{user?.name}</span>
        </div>
      </div>
      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6 bg-orange-50 p-4 rounded-md border border-orange-100">
             <h4 className="font-semibold text-orange-800 mb-2 text-sm">庫存檢查</h4>
             {selectedItem ? (
               <div className="flex gap-4 text-sm">
                 <span className="text-gray-600">料號: <b className="text-gray-900">{selectedItem.pn}</b></span>
                 <span className="text-gray-600">目前可用: <b className="text-blue-600 text-lg">{selectedItem.available_qty}</b></span>
                 <span className="text-gray-600">儲位: {selectedItem.location}</span>
               </div>
             ) : (
               <span className="text-sm text-gray-500">請輸入有效料號以檢查庫存</span>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1 relative">
               <Input 
                label="料號 (P/N)" 
                required 
                value={form.pn} 
                onChange={handlePnChange}
                placeholder="輸入料號或名稱搜尋"
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto top-[72px]">
                  {suggestions.map(item => (
                    <div 
                      key={item.pn}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <div className="font-medium text-gray-800">{item.pn}</div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{item.name || '無名稱'}</span>
                        <span className={item.available_qty > 0 ? 'text-green-600' : 'text-red-500'}>
                          可用: {item.available_qty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Input 
              label="出庫數量" 
              type="number" 
              required 
              value={form.qty} 
              onChange={e => setForm({...form, qty: e.target.value})} 
            />
            
            <div className="relative">
              <Input 
                label="借用人/目的地" 
                required 
                value={form.borrower} 
                onChange={handleBorrowerChange}
                placeholder="輸入姓名或部門"
                onBlur={() => setTimeout(() => setShowBorrowerSuggestions(false), 200)}
              />
              {showBorrowerSuggestions && borrowerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto top-[72px]">
                  {borrowerSuggestions.map(u => (
                    <div 
                      key={u.name}
                      className="px-4 py-2 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-center gap-2"
                      onClick={() => handleSelectBorrower(u.name)}
                    >
                      <User size={14} className="text-gray-400"/>
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Input 
              label="預計歸還日期" 
              type="date"
              required 
              value={form.dueDate} 
              onChange={e => setForm({...form, dueDate: e.target.value})} 
            />
          </div>
          <div className="mt-6 flex gap-3 justify-end">
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button type="submit" disabled={!selectedItem || selectedItem.available_qty <= 0}>確認出庫</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const ReturnForm = ({ user, inventory, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    pn: '',
    qty: '',
    condition: '可用',
    notes: ''
  });
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const item = inventory.find(i => i.pn === form.pn);
    setSelectedItem(item || null);
  }, [form.pn, inventory]);

  const handlePnChange = (e) => {
    const value = e.target.value;
    setForm({...form, pn: value});
    
    if (value.length > 0) {
      // For returns, we might want to prioritize items that have outbound_qty > 0
      const matches = inventory.filter(item => 
        item.pn.toLowerCase().includes(value.toLowerCase()) || 
        (item.name && item.name.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setForm({...form, pn: item.pn});
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <RotateCcw className="text-green-600" /> 歸還作業
        </h2>
        <div className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100 flex items-center gap-2">
          <User size={14} />
          操作人員: <span className="font-semibold">{user?.name}</span>
        </div>
      </div>
      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6 bg-green-50 p-4 rounded-md border border-green-100">
             <h4 className="font-semibold text-green-800 mb-2 text-sm">歸還檢查</h4>
             {selectedItem ? (
               <div className="flex gap-4 text-sm">
                 <span className="text-gray-600">料號: <b className="text-gray-900">{selectedItem.pn}</b></span>
                 <span className="text-gray-600">系統顯示出庫中: <b className="text-orange-600 text-lg">{selectedItem.outbound_qty || 0}</b></span>
               </div>
             ) : (
               <span className="text-sm text-gray-500">請輸入料號以確認歸還資訊</span>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input 
                label="料號 (P/N)" 
                required 
                value={form.pn} 
                onChange={handlePnChange}
                placeholder="輸入料號或名稱搜尋"
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
               {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto top-[72px]">
                  {suggestions.map(item => (
                    <div 
                      key={item.pn}
                      className="px-4 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <div className="font-medium text-gray-800">{item.pn}</div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{item.name || '無名稱'}</span>
                        <span className={(item.outbound_qty || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}>
                          待還: {item.outbound_qty || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Input 
              label="歸還數量" 
              type="number" 
              required 
              value={form.qty} 
              onChange={e => setForm({...form, qty: e.target.value})} 
            />
            <Select 
              label="歸還後狀態"
              value={form.condition}
              onChange={e => setForm({...form, condition: e.target.value})}
              options={[
                { value: '可用', label: '可用 (入庫)' },
                { value: '待檢', label: '待檢 (需測試)' },
                { value: '損壞', label: '損壞 (需報廢/維修)' }
              ]}
            />
            <Input 
              label="備註" 
              value={form.notes} 
              onChange={e => setForm({...form, notes: e.target.value})} 
              placeholder="例如: 外殼輕微刮傷"
            />
          </div>
          <div className="mt-6 flex gap-3 justify-end">
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button type="submit" disabled={!selectedItem || !selectedItem.outbound_qty}>確認歸還</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const InventoryList = ({ user, inventory, onViewHistory }) => {
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  
  const filtered = inventory.filter(i => 
    i.pn.toLowerCase().includes(search.toLowerCase()) || 
    (i.name && i.name.toLowerCase().includes(search.toLowerCase())) ||
    (i.location && i.location.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (pn) => {
    if (window.confirm(`確定要刪除料號 ${pn} 及其所有庫存資料嗎？\n此動作無法復原！`)) {
      try {
        await deleteItem(pn);
        // Toast logic is in parent, but list will update automatically due to subscription
      } catch (e) {
        alert("刪除失敗: " + e);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl w-full">
            <button className="absolute -top-12 right-0 text-white flex items-center gap-2 hover:text-gray-300">
               <X size={32} /> 關閉
            </button>
            <img src={previewImage} className="w-full h-auto rounded-lg shadow-2xl" alt="Preview" />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">庫存查詢</h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋料號、名稱、地點..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="p-4 font-semibold">圖片</th>
                <th className="p-4 font-semibold">料號</th>
                <th className="p-4 font-semibold">名稱</th>
                <th className="p-4 font-semibold">總數</th>
                <th className="p-4 font-semibold">可用</th>
                <th className="p-4 font-semibold">出庫中</th>
                <th className="p-4 font-semibold">地點</th>
                <th className="p-4 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map(item => (
                  <tr key={item.pn} className="hover:bg-gray-50">
                    <td className="p-4">
                      {item.image ? (
                        <button onClick={() => setPreviewImage(item.image)} className="h-10 w-10 rounded border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={item.image} className="h-full w-full object-cover" alt="Thumb" />
                        </button>
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-gray-900">{item.pn}</td>
                    <td className="p-4 text-gray-600">{item.name || '-'}</td>
                    <td className="p-4">{item.total_qty}</td>
                    <td className="p-4 font-bold text-blue-600">{item.available_qty}</td>
                    <td className="p-4 text-orange-600">{item.outbound_qty || 0}</td>
                    <td className="p-4 text-gray-500">{item.location}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-3">
                      <button onClick={onViewHistory} className="text-blue-600 hover:underline">查看歷史</button>
                      {user?.name === ADMIN_NAME && (
                        <button 
                          onClick={() => handleDelete(item.pn)} 
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-400">找不到符合的庫存資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const HistoryLog = ({ transactions, user }) => {
  const [filterPn, setFilterPn] = useState('');
  const [filterOperator, setFilterOperator] = useState('');

  const filtered = transactions.filter(t => 
    (filterPn === '' || t.pn.toLowerCase().includes(filterPn.toLowerCase())) &&
    (filterOperator === '' || (t.operator && t.operator.toLowerCase().includes(filterOperator.toLowerCase())))
  );

  const handleDelete = async (id) => {
    if (window.confirm('確定要刪除這筆歷史記錄嗎？\n注意：這「不會」變更庫存數量，僅刪除日誌。')) {
      try {
        await deleteTransaction(id);
      } catch (e) {
        alert("刪除失敗: " + e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">歷史操作記錄</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="搜尋料號..." 
            value={filterPn}
            onChange={e => setFilterPn(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex-1 md:w-48"
          />
          <input 
            type="text" 
            placeholder="搜尋操作員..." 
            value={filterOperator}
            onChange={e => setFilterOperator(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex-1 md:w-32"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="p-4">時間</th>
                <th className="p-4">類型</th>
                <th className="p-4">料號</th>
                <th className="p-4">數量</th>
                <th className="p-4">操作員</th>
                <th className="p-4">詳細資訊</th>
                {user?.name === ADMIN_NAME && <th className="p-4 text-right">管理</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {t.timestamp ? t.timestamp.toLocaleString('zh-TW') : '-'}
                  </td>
                  <td className="p-4"><StatusBadge status={t.type} /></td>
                  <td className="p-4 font-medium">{t.pn}</td>
                  <td className="p-4">{t.qty}</td>
                  <td className="p-4 text-gray-500">{t.operator}</td>
                  <td className="p-4 text-gray-500 text-xs">
                    {t.type === 'IN' && `來源: ${t.details?.source || '-'}, 狀態: ${t.details?.status || '-'}`}
                    {t.type === 'OUT' && `借用人: ${t.details?.borrower || '-'}, 歸還日: ${t.details?.dueDate || '-'}`}
                    {t.type === 'RETURN' && `狀態: ${t.details?.condition || '-'}, 備註: ${t.details?.notes || '-'}`}
                  </td>
                  {user?.name === ADMIN_NAME && (
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(t.id)} 
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                        title="刪除紀錄"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={user?.name === ADMIN_NAME ? 7 : 6} className="p-8 text-center text-gray-400">無記錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};