import sharp from 'sharp';
import { readFileSync } from 'node:fs';

export interface ProcessedImage {
  base64: string;
  dataUrl: string;
  originalBytes: number;
  processedBytes: number;
}

export async function processImage(path: string): Promise<ProcessedImage> {
  const originalBytes = readFileSync(path).length;

  const buffer = await sharp(path)
    .resize(1024, 1024, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64 = buffer.toString('base64');
  const processedBytes = buffer.length;

  console.error(
    `[processImage] original: ${(originalBytes / 1024).toFixed(1)} KB -> ` +
      `processed JPEG: ${(processedBytes / 1024).toFixed(1)} KB -> ` +
      `base64: ${(base64.length / 1024).toFixed(1)} KB`,
  );

  return {
    base64,
    dataUrl: `data:image/jpeg;base64,${base64}`,
    originalBytes,
    processedBytes,
  };
}
