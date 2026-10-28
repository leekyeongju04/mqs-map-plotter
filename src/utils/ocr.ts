import { createWorker, PSM, Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;
let isWorkerReady = false;

/**
 * Lazily creates and initializes ONE shared Tesseract.js worker with single-line mode (PSM 7)
 * and digits/delimiters whitelist.
 */
async function getOCRWorker(onStatus?: (status: string) => void): Promise<Worker> {
  if (!workerPromise) {
    if (onStatus && !isWorkerReady) {
      onStatus('Loading OCR engine...');
    }
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789,.',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      isWorkerReady = true;
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Calculates the optimal binarization threshold using Otsu's method.
 */
function calculateOtsuThreshold(grayPixels: Uint8Array): number {
  const histogram = new Int32Array(256);
  const total = grayPixels.length;

  for (let i = 0; i < total; i++) {
    histogram[grayPixels[i]]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumB += t * histogram[t];
    const meanBackground = sumB / weightBackground;
    const meanForeground = (sum - sumB) / weightForeground;

    const betweenVariance =
      weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

    if (betweenVariance > maxVariance) {
      maxVariance = betweenVariance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Preprocesses an image on a canvas:
 * 1. Crop to gold area (or full snippet if already cropped)
 * 2. 3x upscale with smoothing
 * 3. Grayscale conversion
 * 4. Otsu automatic thresholding
 * 5. Light-on-dark inversion (ensuring dark text on white background for optimal OCR)
 */
function preprocessImage(
  img: HTMLImageElement,
  cropFraction: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const cropX = Math.round(srcW * cropFraction.x);
  const cropY = Math.round(srcH * cropFraction.y);
  const cropW = Math.max(10, Math.round(srcW * cropFraction.w));
  const cropH = Math.max(10, Math.round(srcH * cropFraction.h));

  console.debug('Image size:', { width: srcW, height: srcH }, 'Crop box:', {
    x: cropX,
    y: cropY,
    w: cropW,
    h: cropH,
  });

  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = cropW * scale;
  canvas.height = cropH * scale;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const pixelCount = canvas.width * canvas.height;
  const grayPixels = new Uint8Array(pixelCount);

  // 1. Grayscale
  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    grayPixels[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // 2. Otsu threshold
  const threshold = calculateOtsuThreshold(grayPixels);

  // 3. Determine if text is light-on-dark by sampling outer border pixels
  let borderSum = 0;
  let borderCount = 0;
  const w = canvas.width;
  const h = canvas.height;

  for (let x = 0; x < w; x++) {
    borderSum += grayPixels[x]; // Top row
    borderSum += grayPixels[(h - 1) * w + x]; // Bottom row
    borderCount += 2;
  }
  for (let y = 1; y < h - 1; y++) {
    borderSum += grayPixels[y * w]; // Left column
    borderSum += grayPixels[y * w + (w - 1)]; // Right column
    borderCount += 2;
  }

  const borderMean = borderCount > 0 ? borderSum / borderCount : 128;
  const isLightOnDark = borderMean < threshold;

  // 4. Threshold & invert if needed to ensure dark text (0) on light background (255)
  for (let i = 0; i < pixelCount; i++) {
    const isBright = grayPixels[i] >= threshold;
    const isText = isLightOnDark ? isBright : !isBright;
    const finalVal = isText ? 0 : 255;

    data[i * 4] = finalVal;
    data[i * 4 + 1] = finalVal;
    data[i * 4 + 2] = finalVal;
    data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Loads a File into an HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Extracts a numeric gold/coin value from an image file using client-side Tesseract.js.
 * Throws an Error if no valid positive number is detected.
 */
export async function extractGoldNumber(
  file: File,
  onStatus?: (status: string) => void
): Promise<number> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please select or paste a valid image file');
  }

  const [worker, img] = await Promise.all([
    getOCRWorker(onStatus),
    loadImageFromFile(file),
  ]);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // Determine crop box:
  // If the image is a full desktop/mobile game screenshot (e.g. width >= 1000 and height >= 500),
  // gold count is typically positioned in the top HUD/gold bar (top right 50% width, top 22% height).
  // If the user already provided a cropped snippet or small image, use the full image.
  const isFullScreen = srcW >= 1000 && srcH >= 500 && srcW / srcH >= 1.3;
  const cropFraction = isFullScreen
    ? { x: 0.5, y: 0.0, w: 0.5, h: 0.22 }
    : { x: 0.0, y: 0.0, w: 1.0, h: 1.0 };

  const canvas = preprocessImage(img, cropFraction);

  const recognitionResult = await worker.recognize(canvas);
  const rawText = recognitionResult?.data?.text || '';

  // Single console.debug of raw OCR text as requested
  console.debug('Raw OCR text:', rawText);

  // Strip everything except digits
  const digitsOnly = rawText.replace(/[^0-9]/g, '');
  const parsedNumber = parseInt(digitsOnly, 10);

  if (isNaN(parsedNumber) || parsedNumber <= 0) {
    // If a full screenshot crop failed, try scanning full image as fail-safe before failing fast
    if (isFullScreen) {
      const fallbackCanvas = preprocessImage(img, { x: 0, y: 0, w: 1, h: 1 });
      const fallbackResult = await worker.recognize(fallbackCanvas);
      const fallbackText = fallbackResult?.data?.text || '';
      console.debug('Raw OCR text (full fallback):', fallbackText);

      const fallbackDigits = fallbackText.replace(/[^0-9]/g, '');
      const fallbackNum = parseInt(fallbackDigits, 10);
      if (!isNaN(fallbackNum) && fallbackNum > 0) {
        return fallbackNum;
      }
    }
    throw new Error('No gold number detected');
  }

  return parsedNumber;
}
