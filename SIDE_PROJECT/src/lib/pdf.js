import * as pdfjsLib from 'pdfjs-dist';

// 設定 PDF.js 的 Worker 來源
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const parsePDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return chunkText(fullText);
};

// 簡單的文字切片 (Chunking) 邏輯
function chunkText(text, size = 800, overlap = 100) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + size;
    chunks.push(text.substring(start, end));
    start = end - overlap; // 重疊以保留語境
  }

  return chunks;
}

