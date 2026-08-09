// src/encode.ts
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import {
  DataURISchema,
  EXTENSION_TO_MIME,
  getCategory,
  MediaTypeSchema,
  type DataURI,
} from './types';

/**
 * Reads a media file from disk and returns it as a Data URI.
 *
 * @param filePath - Path to the media file
 * @returns A DataURI object with the encoded content
 * @throws Error if the file doesn't exist
 * @throws Error if the file extension is unsupported
 * @throws Error if the file is empty (0 bytes)
 */
export async function encodeFile(filePath: string): Promise<DataURI> {
  const extension = extname(filePath).slice(1).toLowerCase();
  const mimeType = EXTENSION_TO_MIME[extension];

  if (!mimeType) {
    throw new Error(`Unsupported file extension: ${extension || '(none)'}`);
  }

  const data = await readFile(filePath);
  return encodeBuffer(data, mimeType);
}

/**
 * Encodes a raw Buffer/Uint8Array as a Data URI with
 * the given MIME type.
 *
 * @param data - The raw binary data
 * @param mimeType - A valid MIME type string
 * @returns A DataURI object
 * @throws Error if the MIME type is unsupported
 * @throws Error if the data is empty
 */
export function encodeBuffer(data: Buffer | Uint8Array, mimeType: string): DataURI {
  const parsedMimeType = MediaTypeSchema.safeParse(mimeType);

  if (!parsedMimeType.success) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (buffer.length === 0) {
    throw new Error('Cannot encode empty data (0 bytes)');
  }

  const base64 = buffer.toString('base64');

  return DataURISchema.parse({
    mediaType: parsedMimeType.data,
    category: getCategory(parsedMimeType.data),
    base64,
    raw: `data:${parsedMimeType.data};base64,${base64}`,
  });
}
