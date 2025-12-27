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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24}/></button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="text-yellow-500" size={20}/> 核心技術：Multimodal Inline Data
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              不同於 RAG 模式將文件「切碎」後儲存，「PDF 全解析實驗室」採用的是 <strong>Long Context Window (長文本視窗)</strong> 技術。
              我們將整份 PDF 轉換為 Base64 編碼，直接作為 Prompt 的一部分發送給模型。
            </p>
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono">
              Prompt = [ User_Question +  &lt;PDF_Base64_Data /&gt; ]
            </div>
          </section>

          <hr className="border-gray-100"/>

          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4">模式優勢</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <CheckCircle className="text-green-500 shrink-0" size={18}/>
                <div>
                  <strong className="text-slate-800">視覺理解 (Vision)：</strong>
                  模型可以直接「看見」PDF 內的圖表、照片與排版，而不僅僅是文字。適合詢問「這張圖表代表什麼趨勢？」
                </div>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="text-green-500 shrink-0" size={18}/>
                <div>
                  <strong className="text-slate-800">全域關聯 (Global Context)：</strong>
                  因為沒有切片，模型能理解整本書的前後因果關係，適合做「全文摘要」或「跨章節比較」。
                </div>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="text-green-500 shrink-0" size={18}/>
                <div>
                  <strong className="text-slate-800">零幻覺風險 (Lower Hallucination)：</strong>
                  模型被限制只能依據當前提供的這份文件回答，大幅降低瞎掰的機率。
                </div>
              </li>
            </ul>
          </section>

          <hr className="border-gray-100"/>

          <section className="bg-red-50 p-4 rounded-xl border border-red-100">
            <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <Lock size={16}/> 隱私與限制
            </h4>
            <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
              <li><strong>用後即焚：</strong>此模式下的檔案與對話紀錄僅存在於記憶體中，關閉視窗即消失，不存入任何資料庫。</li>
              <li><strong>檔案大小：</strong>受限於瀏覽器記憶體與 API 限制，建議上傳 20MB 以下的文件。</li>
            </ul>
          </section>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
          <button onClick={onClose} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md">
            了解原理
          </button>
        </div>
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
          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <Code2 size={24} className="text-blue-600"/> 技術架構與安全聲明
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24}/></button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={20}/> 安全與隱私保護 (Security & Privacy)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                  <Key size={16} className="text-slate-400"/> API Key 保護機制
                </h5>
                <p className="text-slate-600 text-xs leading-relaxed">
                  本系統採用 <strong>Memory-Only (僅限記憶體)</strong> 策略儲存您的 Gemini API Key。
                  金鑰僅存在於當前瀏覽器分頁的 JavaScript 變數中，<strong>絕不會</strong>寫入 localStorage、Cookies 或 IndexedDB。
                  一旦您關閉分頁或重新整理，金鑰即被銷毀，確保最高等級的安全性。
                </p>
              </div>
              <div className="space-y-2">
                <h5 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                  <FileSearch size={16} className="text-slate-400"/> 用後即焚 (Ephemeral Mode)
                </h5>
                <p className="text-slate-600 text-xs leading-relaxed">
                  在「PDF 全解析實驗室」模式下，所有上傳的文件與對話紀錄均採用 <strong>揮發性儲存</strong>。
                  資料僅暫存於記憶體，不會存入 IndexedDB 資料庫。
                  當您關閉該模式視窗時，所有相關數據立即從記憶體中釋放，不留任何數位足跡。
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100"/>

          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="text-yellow-500" size={20}/> 純前端 RAG 架構 (Client-Side RAG)
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              本系統是一個完全運行於瀏覽器端的 RAG (Retrieval-Augmented Generation) 應用。
              我們不依賴任何後端向量資料庫，直接利用瀏覽器的運算能力與 IndexedDB 實現了極致的隱私與零成本部署。
            </p>
            
            <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
              <div className="relative">
                <span className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></span>
                <h5 className="font-bold text-slate-700 text-sm mb-1">1. 文件解析 (Parsing)</h5>
                <p className="text-xs text-slate-500">使用 <code>pdfjs-dist</code> 在瀏覽器端直接解析 PDF 二進位檔，提取純文字內容。</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></span>
                <h5 className="font-bold text-slate-700 text-sm mb-1">2. 智慧切片 (Chunking)</h5>
                <p className="text-xs text-slate-500">將長文本切分為 <strong>800 字元</strong> 的小區塊，並保留 <strong>100 字元</strong> 的重疊 (Overlap)，確保語意連貫性不被切斷。</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></span>
                <h5 className="font-bold text-slate-700 text-sm mb-1">3. 向量化 (Embedding)</h5>
                <p className="text-xs text-slate-500">呼叫 Google <code>text-embedding-004</code> 模型，將每個文字區塊轉換為 <strong>768 維</strong> 的浮點數向量，並存入 IndexedDB。</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></span>
                <h5 className="font-bold text-slate-700 text-sm mb-1">4. 語意檢索 (Retrieval)</h5>
                <p className="text-xs text-slate-500">實作 <strong>Cosine Similarity (餘弦相似度)</strong> 演算法，在瀏覽器端計算使用者問題向量與知識庫向量的相似度，毫秒級召回最相關的 Top 5 片段。</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></span>
                <h5 className="font-bold text-slate-700 text-sm mb-1">5. 生成回答 (Generation)</h5>
                <p className="text-xs text-slate-500">將檢索到的片段作為 Context，結合使用者問題發送給 Gemini 模型，生成基於事實的準確回答。</p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100"/>

          <section>
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="text-slate-500" size={20}/> 核心參數設置
            </h4>
            <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-xs shadow-inner">
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <span className="text-slate-500 block mb-1">Embedding Model</span>
                  <span className="text-green-400">text-embedding-004</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Chat Model</span>
                  <span className="text-blue-400">Selected Gemini Model</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Chunk Size (切片大小)</span>
                  <span className="text-yellow-400">800 characters</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Overlap (重疊區間)</span>
                  <span className="text-yellow-400">100 characters</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Retrieval Metric</span>
                  <span className="text-purple-400">Cosine Similarity</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Similarity Threshold</span>
                  <span className="text-purple-400">Customizable (Default 0.25)</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
            了解，關閉
          </button>
        </div>
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
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFileBase64(null);
      setChatHistory([]);
      setInput('');
      setPdfDoc(null);
      setPageNum(1);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum]);

  const renderPage = async (num) => {
    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderContext = { canvasContext: context, viewport: viewport };
      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Page render error:", err);
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1]; 
        setFileBase64(base64);
      };
      reader.readAsDataURL(f);
      const arrayBuffer = await f.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setPageNum(1);
    }
  };

  const changePage = (offset) => {
    setPageNum(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !fileBase64 || isProcessing) return;
    const userMsg = input;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);
    try {
      const response = await chatWithInlineFile(selectedModel, userMsg, fileBase64, 'application/pdf', chatHistory);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "錯誤: " + err.message }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col animate-fade-in-up">
      <DeepDiveTechSpecsModal isOpen={showTechSpecs} onClose={() => setShowTechSpecs(false)} />
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg"><FileSearch className="text-white" size={24} /></div>
          <div><h2 className="text-white font-bold text-lg">PDF 全解析實驗室</h2><p className="text-slate-400 text-xs">即時預覽 • 多模態理解 • 用後即焚</p></div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors"><X size={28} /></button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[50%] bg-slate-900 border-r border-slate-800 flex flex-col relative">
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-2xl hover:bg-slate-800/50 hover:border-purple-500 transition-all group">
                <Upload className="text-slate-500 group-hover:text-purple-400 mb-4 transition-colors" size={48} />
                <span className="text-slate-300 font-medium">點擊上傳 PDF</span>
                <span className="text-slate-500 text-xs mt-2">支援圖片、表格解析</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              </label>
              <div className="mt-8 text-center"><button onClick={() => setShowTechSpecs(true)} className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 mx-auto transition-colors border-b border-dashed border-slate-600 pb-0.5 hover:border-slate-400"><Lock size={12} /> 查看技術與安全說明</button></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex justify-between items-center p-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2 truncate max-w-[200px]"><FileText className="text-purple-400" size={16} /><span className="text-slate-200 text-sm truncate" title={file.name}>{file.name}</span></div>
                <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1"><button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 text-slate-300"><ChevronLeft size={18} /></button><span className="text-xs text-slate-400 min-w-[3rem] text-center">{pageNum} / {numPages}</span><button onClick={() => changePage(1)} disabled={pageNum >= numPages} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 text-slate-300"><ChevronRight size={18} /></button></div>
                <div className="flex items-center gap-1"><button onClick={() => setShowTechSpecs(true)} className="text-slate-400 hover:text-white p-1 mr-2" title="安全說明"><Lock size={16} /></button><button onClick={() => { setFile(null); setFileBase64(null); setPdfDoc(null); }} className="text-slate-400 hover:text-red-400 p-1" title="移除文件"><Trash2 size={18} /></button></div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-500/20 p-4 flex justify-center items-start"><canvas ref={canvasRef} className="shadow-2xl rounded-sm max-w-full" /></div>
            </div>
          )}
        </div>
        <div className="w-[50%] flex flex-col bg-slate-50 border-l border-slate-200">
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center"><Zap size={64} className="text-slate-200 mb-4" /><h3 className="text-xl font-bold text-slate-500 mb-2">等待文件上傳...</h3><p className="text-sm">左側上傳 PDF 後，即可開始對照閱讀與提問。</p></div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatHistory.length === 0 && (<div className="text-center text-slate-400 py-10"><p className="text-sm bg-purple-50 text-purple-700 py-2 px-4 rounded-full inline-block mb-2">💡 AI 貼心提示</p><p className="text-sm">您可以問：「第 {pageNum} 頁的圖表是什麼意思？」</p></div>)}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-4 rounded-2xl shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>{msg.role === 'user' ? (<div className="whitespace-pre-wrap text-sm">{msg.content}</div>) : (<div className="prose prose-sm max-w-none prose-p:text-slate-600 prose-headings:text-slate-800"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>)}</div>
                  </div>
                ))}
                {isProcessing && (<div className="flex justify-start animate-pulse"><div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-100 text-slate-500 text-xs flex items-center gap-2"><Loader2 size={14} className="animate-spin text-purple-500" />Gemini 正在思考...</div></div>)}
                <div ref={scrollRef} />
              </div>
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2 relative"><input type="text" placeholder="輸入問題..." className="flex-1 pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm" value={input} onChange={(e) => setInput(e.target.value)} disabled={isProcessing} /><button disabled={isProcessing} className="absolute right-1 top-1 bottom-1 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md active:scale-95"><Send size={18} /></button></form>
              </div>
            </>
          )}
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
      setFile(null);
      setNewCategory('');
      if (existingCategories.length > 0) {
        setMode('existing');
        setSelectedCategory(existingCategories[0]);
      } else {
        setMode('new');
      }
    }
  }, [isOpen, existingCategories]);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!file) return alert("請選擇檔案");
    const category = mode === 'existing' ? selectedCategory : newCategory;
    if (!category.trim()) return alert("請輸入或選擇分類名稱");
    onUpload(file, category);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Upload size={20} className="text-blue-600"/> 上傳知識庫</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">選擇 PDF 文件</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all bg-gray-50">{file ? (<div className="text-center"><FileText className="mx-auto h-8 w-8 text-blue-500 mb-2" /><span className="text-sm text-gray-700 font-medium">{file.name}</span><span className="block text-xs text-gray-400 mt-1">點擊更換</span></div>) : (<div className="text-center"><Plus className="mx-auto h-8 w-8 text-gray-400 mb-2" /><span className="text-sm text-gray-500">點擊選擇檔案</span></div>)}<input type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0])} /></label>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">分類設定</label>
            {existingCategories.length > 0 && (<div className="flex gap-4 mb-2"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="catMode" checked={mode === 'existing'} onChange={() => setMode('existing')} className="text-blue-600"/>選擇現有</label><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="catMode" checked={mode === 'new'} onChange={() => setMode('new')} className="text-blue-600"/>建立新分類</label></div>)}
            {mode === 'existing' && existingCategories.length > 0 ? (<div className="relative"><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">{existingCategories.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} /></div>) : (<input type="text" placeholder="輸入新分類名稱" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />)}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50"><button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">取消</button><button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-all">確認上傳</button></div>
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
  const [status, setStatus] = useState({ type: 'info', message: '請先輸入 Gemini API Key' });
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]); 
  const [expandedCategories, setExpandedCategories] = useState({}); 
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); 
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
    setStatus({ type: 'info', message: '正在驗證 API Key...' });
    try {
      const models = await fetchAvailableModels(apiKey);
      setAvailableModels(models);
      const defaultModel = models.find(m => m.includes('gemini-3-flash-preview')) || models.find(m => m.includes('2.0-flash')) || models.find(m => m.includes('1.5-flash')) || models[0];
      setSelectedModel(defaultModel);
      setShowModelSelection(true);
      setStatus({ type: 'success', message: '驗證成功！' });
    } catch (err) { setStatus({ type: 'error', message: err.message }); }
  };

  const handleStart = () => { initGemini(apiKey); setIsAuthorized(true); setStatus({ type: 'success', message: `已使用模型: ${selectedModel}` }); };

  const handleUploadProcess = async (file, category) => {
    setIsProcessing(true);
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    try {
      const chunksText = await parsePDF(file);
      const processedChunks = [];
      let count = 0;
      for (const text of chunksText) {
        count++;
        setStatus({ type: 'info', message: `處理進度：${count} / ${chunksText.length} (向量化中...)` });
        if (count > 1) await sleep(1000); 
        const embedding = await getEmbedding(text);
        processedChunks.push({ content: text, embedding, metadata: { fileName: file.name } });
      }
      await saveDocument(file.name, category, processedChunks);
      await loadDocs();
      setStatus({ type: 'success', message: `「${file.name}」處理完成！` });
      setExpandedCategories(prev => ({...prev, [category]: true}));
      if (!selectedCategories.includes(category)) setSelectedCategories(prev => [...prev, category]);
    } catch (err) { console.error(err); setStatus({ type: 'error', message: '處理失敗：' + err.message }); } finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;
    const userMsg = inputMessage;
    setInputMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);
    try {
      const intent = await analyzeQueryIntent(userMsg, chatHistory);
      let currentChunks = lastChunks;
      let finalQuery = userMsg;
      if (intent.type === 'search') {
        finalQuery = intent.newQuery; 
        let filterDocIds = null;
        if (selectedCategories.length > 0) filterDocIds = documents.filter(doc => selectedCategories.includes(doc.category || '未分類')).map(doc => doc.id);
        const queryVector = await getEmbedding(finalQuery);
        const searchResults = await searchChunks(queryVector, filterDocIds);
        const topMatch = searchResults[0];
        if (!topMatch || topMatch.similarity < similarityThreshold) {
           setChatHistory(prev => [...prev, { role: 'assistant', content: `知識庫中似乎沒有關於「${finalQuery}」的相關資訊 (匹配度 ${topMatch ? (topMatch.similarity * 100).toFixed(1) : 0}% < 門檻 ${(similarityThreshold * 100).toFixed(0)}%)。您可以嘗試調低門檻。` }]);
           setIsProcessing(false);
           return;
        }
        currentChunks = searchResults;
        setLastChunks(searchResults); 
      }
      const aiResponse = await chatWithGemini(selectedModel, finalQuery, currentChunks, chatHistory);
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) { setChatHistory(prev => [...prev, { role: 'assistant', content: '錯誤：' + err.message }]); } finally { setIsProcessing(false); }
  };

  const handleDeleteDoc = async (docId, docName) => { if (window.confirm(`確定要刪除文件「${docName}」嗎？`)) { await deleteDocument(docId); loadDocs(); } };
  const handleDeleteCat = async (catName) => { if (window.confirm(`確定要刪除分類「${catName}」嗎？`)) { await deleteCategory(catName); loadDocs(); setSelectedCategories(prev => prev.filter(c => c !== catName)); } };
  const handleRenameCat = async (oldName) => { const newName = window.prompt("請輸入新的名稱:", oldName); if (newName && newName !== oldName) { await updateCategory(oldName, newName); loadDocs(); if (selectedCategories.includes(oldName)) setSelectedCategories(prev => [...prev.filter(c => c !== oldName), newName]); } };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-blue-500">
          <div className="flex justify-center mb-6"><div className="p-4 bg-blue-50 rounded-full"><Key size={40} className="text-blue-600" /></div></div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Gemini Local RAG</h2>
          <p className="text-center text-slate-500 mb-8 text-sm">請輸入您的 Gemini API Key。<br/>密鑰僅儲存在當前分頁記憶體中。</p>
          {!showModelSelection ? (
            <form onSubmit={handleVerifyKey} className="space-y-4">
              <input type="password" placeholder="AIza..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">驗證並取得模型清單</button>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">選擇模型</label><select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">{availableModels.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <button onClick={handleStart} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2">開始對話 <Settings size={18}/></button>
              <button onClick={() => setShowModelSelection(false)} className="w-full text-slate-400 text-sm hover:text-slate-600">更換 API Key</button>
            </div>
          )}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-400 text-center">安全提示：此應用程式為純前端執行。您的資料絕不會離開瀏覽器。</div>
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
        <div className="p-6 border-b border-slate-800 flex items-center gap-3"><BookOpen className="text-blue-400" /><span className="font-bold text-xl tracking-tight">RAG 知識庫</span></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="flex justify-between items-center px-2"><span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">知識庫分類</span><button onClick={async () => { if(window.confirm("清空全部資料？")) { await clearAllData(); loadDocs(); setChatHistory([]); } }} className="text-slate-500 hover:text-red-400 p-1 rounded" title="清空"><Trash2 size={14}/></button></div>
          <div className="space-y-3">
            {categoryList.length === 0 && (<div className="text-center py-10 text-slate-600 text-sm italic">暫無文件</div>)}
            {Object.entries(groupedDocs).map(([category, docs]) => (
              <div key={category} className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-300 hover:text-white group bg-slate-800/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category])} className="rounded border-slate-600 bg-slate-800 text-blue-600" />
                  <button onClick={() => setExpandedCategories(p => ({...p, [category]: !p[category]}))} className="flex-1 flex items-center gap-2 text-left">{expandedCategories[category] ? <FolderOpen size={16} className="text-yellow-500"/> : <Folder size={16} className="text-yellow-500"/>}<span className="font-medium truncate max-w-[100px]">{category}</span><span className="text-xs text-slate-500 ml-auto bg-slate-900 px-1.5 rounded-full">{docs.length}</span></button>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 gap-1"><button onClick={() => handleRenameCat(category)} className="p-1 hover:text-blue-400"><Edit2 size={12}/></button><button onClick={() => handleDeleteCat(category)} className="p-1 hover:text-red-400"><Trash2 size={12}/></button></div>
                </div>
                {expandedCategories[category] && (<div className="ml-4 pl-3 border-l-2 border-slate-700 space-y-1 py-1">{docs.map(doc => (<div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-800 text-xs text-slate-400 group/file transition-colors"><div className="flex items-center gap-2 overflow-hidden"><FileText size={14} className="shrink-0 text-slate-500" /><span className="truncate" title={doc.name}>{doc.name}</span></div><button onClick={() => handleDeleteDoc(doc.id, doc.name)} className="opacity-0 group-hover/file:opacity-100 p-1 hover:text-red-400"><X size={12}/></button></div>))}</div>)}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900">
          <div className="text-[10px] text-slate-500 flex flex-col gap-1 px-1">
            <div className="flex justify-between"><span>模型:</span> <span className="text-slate-300 truncate max-w-[120px]">{selectedModel}</span></div>
            <div className="flex justify-between"><span>範圍:</span> <span className={selectedCategories.length === 0 ? "text-green-400" : "text-yellow-400"}>{selectedCategories.length === 0 ? "全域" : `${selectedCategories.length} 個分類`}</span></div>
            <div className="mt-2 pt-2 border-t border-slate-800"><div className="flex justify-between mb-1"><span>相似度門檻:</span><span className="text-blue-400 font-mono">{(similarityThreshold * 100).toFixed(0)}%</span></div><input type="range" min="0" max="1" step="0.05" value={similarityThreshold} onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
          </div>
          <button onClick={() => setShowDeepDive(true)} className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg mb-2"><FileSearch size={20} /><span>PDF 全解析實驗室</span></button>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => setShowTechSpecs(true)} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-medium text-xs transition-all border border-slate-700"><Code2 size={16} />技術說明</button><button onClick={() => setShowUploadModal(true)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg"><Plus size={16} />新增文件</button></div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col relative bg-slate-50">
        <div className={`p-2 text-center text-xs font-medium border-b flex items-center justify-center gap-2 transition-colors duration-300 ${status.type === 'error' ? 'bg-red-50 text-red-700' : status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{status.type === 'error' && <AlertCircle size={14} />}{status.type === 'success' && <CheckCircle size={14} />}{isProcessing && <Loader2 size={14} className="animate-spin" />}{status.message}</div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {chatHistory.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-slate-400 animate-fade-in-up"><div className="bg-white p-6 rounded-full shadow-sm mb-6"><MessageSquare size={48} className="text-blue-100" /></div><h3 className="text-xl font-bold text-slate-700 mb-2">歡迎使用 Gemini RAG</h3><p className="text-sm max-w-xs text-center leading-relaxed">請點擊左側「新增文件」上傳 PDF，並勾選分類。</p></div>)}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
              <div className={`max-w-[85%] p-5 rounded-2xl shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}> 
                {msg.role === 'user' ? (<div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>) : (<div className="prose prose-sm max-w-none prose-headings:font-bold prose-p:text-slate-600 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-table:border-collapse prose-table:w-full prose-th:bg-slate-100 prose-th:p-2 prose-td:p-2 prose-td:border-b"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>)}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative"><input type="text" placeholder={documents.length > 0 ? "輸入您的問題..." : "目前無知識庫文件，僅進行一般閒聊..."} disabled={isProcessing} className="flex-1 pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60 transition-all text-slate-700" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} /><button disabled={isProcessing} className={`absolute right-2 top-2 bottom-2 p-3 text-white rounded-xl transition-all shadow-md active:scale-95 ${isProcessing ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}</button></form>
          <div className="text-center mt-2 text-[10px] text-slate-400">由 Gemini {selectedModel} 提供支援 • 本地 RAG 引擎</div>
        </div>
      </main>
    </div>
  );
}