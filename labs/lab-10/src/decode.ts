// src/decode.ts
import { writeFile } from 'node:fs/promises';

import { DataURISchema, getCategory, MediaTypeSchema, type DataURI } from './types';

const DATA_URI_PATTERN = /^data:([^;,]+);base64,([\s\S]+)$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function normalizeBase64(base64: string): string {
  return base64.replaceAll(/\s+/g, '');
}

function decodeBase64(base64: string): Buffer {
  const normalizedBase64 = normalizeBase64(base64);

  if (!BASE64_PATTERN.test(normalizedBase64)) {
    throw new Error('Invalid Base64 content');
  }

  const decoded = Buffer.from(normalizedBase64, 'base64');

  if (decoded.length === 0 || decoded.toString('base64') !== normalizedBase64) {
    throw new Error('Invalid Base64 content');
  }

  return decoded;
}

/**
 * Parses a Data URI string into its components.
 *
 * @param uri - A complete Data URI string
 *   (e.g. "data:image/png;base64,iVBOR...")
 * @returns A DataURI object with parsed components
 * @throws Error if the string is not a valid Data URI
 * @throws Error if the MIME type is unsupported
 * @throws Error if the Base64 content is invalid
 */
export function parseDataURI(uri: string): DataURI {
  const match = DATA_URI_PATTERN.exec(uri);

  if (!match) {
    throw new Error('Invalid Data URI');
  }

  const [, mimeType, base64] = match;
  const parsedMimeType = MediaTypeSchema.safeParse(mimeType);

  if (!parsedMimeType.success) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  const normalizedBase64 = normalizeBase64(base64);
  decodeBase64(normalizedBase64);

  return DataURISchema.parse({
    mediaType: parsedMimeType.data,
    category: getCategory(parsedMimeType.data),
    base64: normalizedBase64,
    raw: uri,
  });
}

/**
 * Decodes a Data URI string back into raw binary data.
 *
 * @param uri - A complete Data URI string
 * @returns A Buffer containing the decoded binary data
 * @throws Error if the URI is invalid
 */
export function decodeToBuffer(uri: string): Buffer {
  const parsed = parseDataURI(uri);
  return decodeBase64(parsed.base64);
}

/**
 * Decodes a Data URI and writes the result to a file.
 *
 * @param uri - A complete Data URI string
 * @param outputPath - Where to write the decoded file
 * @throws Error if the URI is invalid
 */
export async function decodeToFile(uri: string, outputPath: string): Promise<void> {
  const decoded = decodeToBuffer(uri);
  await writeFile(outputPath, decoded);
}
