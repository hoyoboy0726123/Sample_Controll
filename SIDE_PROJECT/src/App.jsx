import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  FileText, 
  Key, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Settings,
  Folder,
  FolderOpen,
  Edit2,
  X,
  Upload,
  ChevronDown,
  Code2,
  Cpu,
  Database,
  Search as SearchIcon,
  Zap,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as pdfjsLib from 'pdfjs-dist';
import { initGemini, getEmbedding, chatWithGemini, fetchAvailableModels, analyzeQueryIntent, chatWithInlineFile } from './lib/gemini';
import { parsePDF } from './lib/pdf';
import { saveDocument, getAllDocuments, clearAllData, searchChunks, deleteDocument, deleteCategory, updateCategory } from './lib/db';

// --- Components ---

const DeepDiveTechSpecsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
          <h3 className="font-bold text-xl text-purple-900 flex items-center gap-2">
            <FileSearch size={24} className="text-purple-600"/> 全解析模式：技術原理
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap className="text-yellow-500" size={20}/> 核心技術：Multimodal Inline Data</h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">本模式採用 Long Context Window 技術。將整份 PDF 轉為 Base64 直接發送給模型，使其能「看見」圖表與排版。</p>
          </section>
          <hr className="border-gray-100"/>
          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4">模式優勢</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2"><CheckCircle className="text-green-500 shrink-0" size={18}/><div><strong>視覺理解：</strong>模型直接解析 PDF 內的影像與表格。</div></li>
              <li className="flex gap-2"><CheckCircle className="text-green-500 shrink-0" size={18}/><div><strong>全域關聯：</strong>理解整份文件的脈絡，適合總結全文。</div></li>
            </ul>
          </section>
          <hr className="border-gray-100"/>
          <section className="bg-red-50 p-4 rounded-xl border border-red-100">
            <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2"><Lock size={16}/> 隱私與限制</h4>
            <ul className="list-disc list-inside text-xs text-red-700 space-y-1"><li>用後即焚：關閉即消失，不留痕跡。</li><li>大小限制：建議 20MB 以下。</li></ul>
          </section>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50"><button onClick={onClose} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md">了解原理</button></div>
      </div>
    </div>
  );
};

const TechSpecsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Code2 size={24} className="text-blue-600"/> 技術架構與安全聲明</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2"><ShieldCheck className="text-blue-600" size={20}/> 安全與隱私保護</h4>
            <p className="text-slate-600 text-xs leading-relaxed">金鑰採用 <strong>Memory-Only</strong> 策略，不寫入硬碟或快取。關閉即銷毀。</p>
          </section>
          <hr className="border-gray-100"/>
          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap className="text-yellow-500" size={20}/> 純前端 RAG 架構</h4>
            <div className="text-xs text-slate-500 space-y-2">
              <p>1. <strong>解析：</strong>pdfjs-dist 提取文字。</p>
              <p>2. <strong>切片：</strong>800 字元區塊 + 100 重疊。</p>
              <p>3. <strong>向量：</strong>text-embedding-004 (768維)。</p>
              <p>4. <strong>檢索：</strong>本地餘弦相似度計算。</p>
            </div>
          </section>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50"><button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">了解，關閉</button></div>
      </div>
    </div>
  );
};

const PDFDeepDiveModal = ({ isOpen, onClose, selectedModel }) => {
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isOpen) { setFile(null); setFileBase64(null); setChatHistory([]); setPdfDoc(null); }
  }, [isOpen]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) { renderPage(pageNum); }
  }, [pdfDoc, pageNum]);

  const renderPage = async (num) => {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => setFileBase64(e.target.result.split(',')[1]);
      reader.readAsDataURL(f);
      const pdf = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setPageNum(1);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !fileBase64 || isProcessing) return;
    const msg = input; setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsProcessing(true);
    try {
      const res = await chatWithInlineFile(selectedModel, msg, fileBase64, 'application/pdf', chatHistory);
      setChatHistory(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (err) { setChatHistory(prev => [...prev, { role: 'assistant', content: "錯誤: " + err.message }]); }
    finally { setIsProcessing(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col animate-fade-in-up">
      <DeepDiveTechSpecsModal isOpen={showSpecs} onClose={() => setShowSpecs(false)} />
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-3"><div className="p-2 bg-purple-600 rounded-lg"><FileSearch className="text-white" size={24} /></div><h2 className="text-white font-bold">PDF 全解析實驗室</h2></div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={28} /></button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[50%] bg-slate-900 border-r border-slate-800 flex flex-col">
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-2xl hover:border-purple-500 text-slate-300">
                <Upload size={48} className="mb-4" />上傳 PDF
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              </label>
              <button onClick={() => setShowSpecs(true)} className="mt-8 text-slate-500 text-xs flex items-center gap-1 hover:text-slate-300"><Lock size={12} /> 技術與安全說明</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex justify-between items-center p-3 bg-slate-800 border-b border-slate-700">
                <span className="text-slate-200 text-sm truncate max-w-[150px]">{file.name}</span>
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg">
                  <button onClick={() => setPageNum(p => Math.max(1, p-1))} disabled={pageNum <= 1} className="p-1 disabled:opacity-30"><ChevronLeft size={18} /></button>
                  <span className="text-xs text-slate-400">{pageNum}/{numPages}</span>
                  <button onClick={() => setPageNum(p => Math.min(numPages, p+1))} disabled={pageNum >= numPages} className="p-1 disabled:opacity-30"><ChevronRight size={18} /></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSpecs(true)} className="text-slate-400 hover:text-white"><Lock size={16}/></button>
                  <button onClick={() => { setFile(null); setFileBase64(null); }} className="text-slate-400 hover:text-red-400"><Trash2 size={18}/></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-500/20 p-4 flex justify-center items-start"><canvas ref={canvasRef} className="shadow-2xl max-w-full" /></div>
            </div>
          )}
        </div>
        <div className="w-[50%] flex flex-col bg-slate-50">
          {file ? (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-100'}`}>
                      {msg.role === 'user' ? msg.content : <div className="prose prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>}
                    </div>
                  </div>
                ))}
                {isProcessing && <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />思考中...</div>}
                <div ref={scrollRef} />
              </div>
              <div className="p-4 bg-white border-t"><form onSubmit={handleSend} className="flex gap-2"><input type="text" placeholder="提問..." className="flex-1 p-3 bg-slate-100 rounded-xl outline-none" value={input} onChange={e => setInput(e.target.value)} /><button className="p-3 bg-purple-600 text-white rounded-xl"><Send size={18} /></button></form></div>
            </>
          ) : <div className="flex-1 flex items-center justify-center text-slate-400">請上傳文件</div>}
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ isOpen, onClose, onUpload, existingCategories }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('existing');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  useEffect(() => {
    if (isOpen) {
      setFile(null); setNewCategory('');
      if (existingCategories.length > 0) { setMode('existing'); setSelectedCategory(existingCategories[0]); }
      else { setMode('new'); }
    }
  }, [isOpen, existingCategories]);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!file || !(mode === 'existing' ? selectedCategory : newCategory).trim()) return alert("請檢查欄位");
    onUpload(file, mode === 'existing' ? selectedCategory : newCategory); onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">上傳知識庫</h3><button onClick={onClose}><X size={20}/></button></div>
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            {file ? <span className="text-sm">{file.name}</span> : <span>點擊選擇 PDF</span>}
            <input type="file" className="hidden" accept=".pdf" onChange={e => setFile(e.target.files?.[0])} />
          </label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} />現有分類</label>
            <label className="flex items-center gap-1"><input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />新分類</label>
          </div>
          {mode === 'existing' ? <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-2 border rounded-lg">{existingCategories.map(c => <option key={c} value={c}>{c}</option>)}</select> : <input type="text" placeholder="新分類名稱" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-2 border rounded-lg" />}
        </div>
        <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2">取消</button><button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">確認</button></div>
      </div>
    </div>
  );
};

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [status, setStatus] = useState({ type: 'info', message: '請先輸入 API Key' });
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]); 
  const [expandedCategories, setExpandedCategories] = useState({}); 
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [lastChunks, setLastChunks] = useState([]);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.25);
  const chatEndRef = useRef(null);

  useEffect(() => { if (isAuthorized) loadDocs(); }, [isAuthorized]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const loadDocs = async () => { const docs = await getAllDocuments(); setDocuments(docs); };
  const groupedDocs = useMemo(() => {
    const groups = {};
    documents.forEach(doc => { const cat = doc.category || '未分類'; if (!groups[cat]) groups[cat] = []; groups[cat].push(doc); });
    return groups;
  }, [documents]);
  const categoryList = Object.keys(groupedDocs);

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    if (!apiKey) return;
    setStatus({ type: 'info', message: '正在驗證...' });
    try {
      const models = await fetchAvailableModels(apiKey);
      setAvailableModels(models);
      const def = models.find(m => m.includes('gemini-3-flash-preview')) || models.find(m => m.includes('2.0-flash')) || models.find(m => m.includes('1.5-flash')) || models[0];
      setSelectedModel(def); setShowModelSelection(true); setStatus({ type: 'success', message: '驗證成功' });
    } catch (err) { setStatus({ type: 'error', message: err.message }); }
  };

  const handleStart = () => { initGemini(apiKey); setIsAuthorized(true); };

  const handleUploadProcess = async (file, category) => {
    setIsProcessing(true); const sleep = (ms) => new Promise(r => setTimeout(resolve, ms));
    try {
      const textChunks = await parsePDF(file);
      const processed = [];
      for (const text of textChunks) {
        setStatus({ type: 'info', message: `向量化中... (${processed.length + 1}/${textChunks.length})` });
        if (processed.length > 0) await new Promise(r => setTimeout(r, 1000));
        const emb = await getEmbedding(text);
        processed.push({ content: text, embedding: emb, metadata: { fileName: file.name } });
      }
      await saveDocument(file.name, category, processed); loadDocs();
      setStatus({ type: 'success', message: '處理完成' });
    } catch (err) { setStatus({ type: 'error', message: err.message }); }
    finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;
    const msg = inputMessage; setInputMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsProcessing(true);
    try {
      const intent = await analyzeQueryIntent(msg, chatHistory);
      let chunks = lastChunks;
      if (intent.type === 'search') {
        const filterIds = selectedCategories.length > 0 ? documents.filter(d => selectedCategories.includes(d.category)).map(d => d.id) : null;
        const vec = await getEmbedding(intent.newQuery);
        const results = await searchChunks(vec, filterIds);
        if (!results[0] || results[0].similarity < similarityThreshold) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: "知識庫中無相關資訊。" }]);
          setIsProcessing(false); return;
        }
        chunks = results; setLastChunks(results);
      }
      const aiRes = await chatWithGemini(selectedModel, intent.newQuery || msg, chunks, chatHistory);
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiRes }]);
    } catch (err) { setChatHistory(prev => [...prev, { role: 'assistant', content: "錯誤: " + err.message }]); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteDoc = async (id, name) => { if (confirm(`刪除「${name}」？`)) { await deleteDocument(id); loadDocs(); } };
  const handleDeleteCat = async (name) => { if (confirm(`刪除分類「${name}」及其內容？`)) { await deleteCategory(name); loadDocs(); } };
  const handleRenameCat = async (old) => { const n = prompt("新名稱:", old); if (n && n !== old) { await updateCategory(old, n); loadDocs(); } };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-blue-500">
          <div className="flex justify-center mb-6"><Key size={40} className="text-blue-600" /></div>
          <h2 className="text-2xl font-bold text-center mb-2">Gemini Local RAG</h2>
          {!showModelSelection ? (
            <form onSubmit={handleVerifyKey} className="space-y-4">
              <input type="password" placeholder="API Key" className="w-full p-3 border rounded-xl" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">驗證</button>
            </form>
          ) : (
            <div className="space-y-4">
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full p-3 border rounded-xl">{availableModels.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <button onClick={handleStart} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold">開始</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} onUpload={handleUploadProcess} existingCategories={categoryList} />
      <TechSpecsModal isOpen={showTechSpecs} onClose={() => setShowTechSpecs(false)} />
      <PDFDeepDiveModal isOpen={showDeepDive} onClose={() => setShowDeepDive(false)} selectedModel={selectedModel} />
      <aside className="w-80 bg-slate-900 text-white flex flex-col shadow-2xl border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3"><BookOpen className="text-blue-400" /><span className="font-bold text-xl">RAG 知識庫</span></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="flex justify-between items-center px-2 text-xs font-semibold text-slate-400"><span>分類清單</span><button onClick={async () => { if(confirm("清空？")) { await clearAllData(); loadDocs(); } }}><Trash2 size={14}/></button></div>
          <div className="space-y-2">
            {Object.entries(groupedDocs).map(([cat, docs]) => (
              <div key={cat} className="space-y-1">
                <div className="flex items-center gap-2 text-sm bg-slate-800/50 p-2 rounded-lg group">
                  <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => setSelectedCategories(p => p.includes(cat) ? p.filter(c => c!==cat) : [...p, cat])} />
                  <button className="flex-1 text-left truncate" onClick={() => setExpandedCategories(p => ({...p, [cat]: !p[cat]}))}>{cat}</button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => handleRenameCat(cat)}><Edit2 size={12}/></button><button onClick={() => handleDeleteCat(cat)}><Trash2 size={12}/></button></div>
                </div>
                {expandedCategories[cat] && <div className="ml-4 pl-2 border-l border-slate-700">{docs.map(d => <div key={d.id} className="text-xs p-1 flex justify-between group"><span>{d.name}</span><button onClick={() => handleDeleteDoc(d.id, d.name)} className="opacity-0 group-hover:opacity-100">x</button></div>)}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900">
          <div className="text-[10px] text-slate-500 space-y-1">
            <div className="flex justify-between"><span>門檻: {(similarityThreshold*100).toFixed(0)}%</span></div>
            <input type="range" min="0" max="1" step="0.05" value={similarityThreshold} onChange={e => setSimilarityThreshold(parseFloat(e.target.value))} className="w-full h-1 accent-blue-500" />
          </div>
          <button onClick={() => setShowDeepDive(true)} className="w-full bg-purple-600 p-3 rounded-xl font-bold text-xs">PDF 全解析實驗室</button>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => setShowTechSpecs(true)} className="bg-slate-800 p-2 rounded-xl text-[10px]">技術說明</button><button onClick={() => setShowUploadModal(true)} className="bg-blue-600 p-2 rounded-xl text-[10px] font-bold">新增文件</button></div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col relative bg-slate-50">
        <div className={`p-2 text-center text-xs border-b ${status.type==='error'?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700'}`}>{isProcessing && <Loader2 size={12} className="inline animate-spin mr-1"/>}{status.message}</div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400">請開始提問</div> : chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                {msg.role === 'user' ? msg.content : <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-6 bg-white border-t"><form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative"><input type="text" placeholder="輸入問題..." disabled={isProcessing} className="flex-1 p-4 bg-slate-50 border rounded-2xl outline-none" value={inputMessage} onChange={e => setInputMessage(e.target.value)} /><button className="bg-blue-600 text-white p-3 rounded-xl"><Send size={20}/></button></form></div>
      </main>
    </div>
  );
}
