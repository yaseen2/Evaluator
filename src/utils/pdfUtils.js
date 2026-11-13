import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Converts a PDF file into an array of compressed image pages (data URLs)
 * Each page is rendered to an offscreen canvas at high resolution for Gemini OCR.
 *
 * @param {File} pdfFile - The uploaded PDF file
 * @param {Object} options - Configuration options (maxPages, scale, quality)
 * @returns {Promise<Array<{dataUrl: string, name: string, size: number, pageNumber: number, totalPages: number}>>}
 */
export async function convertPdfToImagePages(pdfFile, options = {}) {
  const {
    maxPages = 35, // Max allowed per submission
    scale = 1.65,  // Crisp DPI scale while staying within upload limits for 35 pages
    quality = 0.80 // JPEG compression quality
  } = options;

  if (!pdfFile) return [];

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;

  const totalPages = pdfDocument.numPages;
  const pagesToExtract = Math.min(totalPages, maxPages);
  const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
  const renderedPages = [];

  for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d', { alpha: false });

    // Fill white background for handwriting legibility
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Convert canvas to JPEG data URL
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const estimatedSize = Math.round((dataUrl.length * 3) / 4);

    renderedPages.push({
      dataUrl,
      name: `${baseName} (Page ${pageNum} of ${totalPages})`,
      size: estimatedSize,
      pageNumber: pageNum,
      totalPages: totalPages
    });

    // Clean up canvas
    canvas.width = 0;
    canvas.height = 0;
  }

  return renderedPages;
}

