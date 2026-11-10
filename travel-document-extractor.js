import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf.mjs';
import { createWorker } from 'tesseract.js';
import { parseBookingText, parseDistinctBookingPages } from './travel-document-parser.js';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
let ocrWorker;

async function worker() {
  if (!ocrWorker) ocrWorker = createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/tesseract-core-lstm.wasm.js',
    langPath: '/ocr/lang',
    gzip: true,
    workerBlobURL: false,
    logger: () => {},
  });
  return ocrWorker;
}

async function recognize(image) {
  const engine = await worker();
  const result = await engine.recognize(image);
  return result.data.text || '';
}

export async function extractBookingDocument(file, onProgress = () => {}) {
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  const isPdf = file?.type === 'application/pdf' || extension === 'pdf';
  const isImage = file?.type?.startsWith('image/') || ['jpg','jpeg','png','webp','gif','bmp','tif','tiff'].includes(extension);
  if (!file || (!isImage && !isPdf)) throw new Error('Choose a PDF, JPEG, PNG or other supported image document.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a document smaller than 25 MB.');
  let pages = [];
  if (isPdf) {
    const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    if (pdf.numPages > 10) throw new Error('For safety and speed, process PDFs with 10 pages or fewer.');
    let totalText = '';
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str || '').join(' ');
      pages.push({ page, text: pageText }); totalText += pageText;
      onProgress({ phase: 'reading', page: number, pages: pdf.numPages });
    }
    if (totalText.replace(/\s/g, '').length > 80) {
      const result = parseBookingText(pages.map(x => x.text).join('\n'));
      const candidates = parseDistinctBookingPages(pages);
      if (candidates.length > 1) result.candidates = candidates;
      return result;
    }
    let text = ''; const ocrPages = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i].page, viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const pageText = await recognize(canvas); text += `\n${pageText}`; ocrPages.push({ text: pageText }); canvas.width = 0; canvas.height = 0;
      onProgress({ phase: 'ocr', page: i + 1, pages: pages.length });
    }
    const result = parseBookingText(text); const candidates = parseDistinctBookingPages(ocrPages); if (candidates.length > 1) result.candidates = candidates; return result;
  }
  const text = await recognize(file);
  return parseBookingText(text);
}
