import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { decodeToBuffer } from '../src/decode';
import { encodeBuffer, encodeFile } from '../src/encode';
import type { MediaType } from '../src/types';
import { getCategory } from '../src/types';

const fixturesDir = resolve(__dirname, 'fixtures');

const fixtureCases: Array<{
  fileName: string;
  mediaType: MediaType;
}> = [
  { fileName: 'test.png', mediaType: 'image/png' },
  { fileName: 'test.jpg', mediaType: 'image/jpeg' },
  { fileName: 'test.svg', mediaType: 'image/svg+xml' },
  { fileName: 'test.mp3', mediaType: 'audio/mpeg' },
];

const tempRoot = await mkdtemp(join(tmpdir(), 'data-uri-encode-tests-'));

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function fixturePath(fileName: string): string {
  return join(fixturesDir, fileName);
}

describe('encodeFile', () => {
  it.each(fixtureCases)(
    'encodes $fileName with the expected metadata',
    async ({ fileName, mediaType }) => {
      const encoded = await encodeFile(fixturePath(fileName));

      expect(encoded.mediaType).toBe(mediaType);
      expect(encoded.category).toBe(getCategory(mediaType));
      expect(encoded.base64.length).toBeGreaterThan(0);
      expect(encoded.raw).toBe(`data:${mediaType};base64,${encoded.base64}`);
    },
  );

  it.each(fixtureCases)(
    'round-trips $fileName back to the original bytes',
    async ({ fileName }) => {
      const original = await readFile(fixturePath(fileName));
      const encoded = await encodeFile(fixturePath(fileName));
      const decoded = decodeToBuffer(encoded.raw);

      expect(decoded.equals(original)).toBe(true);
    },
  );

  it('rejects a nonexistent file path', async () => {
    await expect(encodeFile(join(tempRoot, 'missing.png'))).rejects.toThrow(
      /(not exist|no such file|enoent)/i,
    );
  });

  it('rejects unsupported file extensions', async () => {
    const unsupportedPath = join(tempRoot, 'sample.txt');
    await writeFile(unsupportedPath, 'plain text');

    await expect(encodeFile(unsupportedPath)).rejects.toThrow(/unsupported/i);
  });

  it('rejects empty files', async () => {
    const emptyPath = join(tempRoot, 'empty.png');
    await writeFile(emptyPath, Buffer.alloc(0));

    await expect(encodeFile(emptyPath)).rejects.toThrow(/empty|0 bytes/i);
  });

  it('supports uppercase file extensions such as .PNG', async () => {
    const original = await readFile(fixturePath('test.png'));
    const uppercasePath = join(tempRoot, 'uppercase.PNG');
    await writeFile(uppercasePath, original);

    const encoded = await encodeFile(uppercasePath);
    const decoded = decodeToBuffer(encoded.raw);

    expect(encoded.mediaType).toBe('image/png');
    expect(encoded.category).toBe('image');
    expect(decoded.equals(original)).toBe(true);
  });

  it('supports the .jpeg alias for image/jpeg', async () => {
    const original = await readFile(fixturePath('test.jpg'));
    const jpegPath = join(tempRoot, 'alias.jpeg');
    await writeFile(jpegPath, original);

    const encoded = await encodeFile(jpegPath);
    const decoded = decodeToBuffer(encoded.raw);

    expect(encoded.mediaType).toBe('image/jpeg');
    expect(encoded.category).toBe('image');
    expect(decoded.equals(original)).toBe(true);
  });
});

describe('encodeBuffer', () => {
  it('encodes PNG bytes with the expected Data URI fields', async () => {
    const data = await readFile(fixturePath('test.png'));
    const encoded = encodeBuffer(data, 'image/png');

    expect(encoded.mediaType).toBe('image/png');
    expect(encoded.category).toBe('image');
    expect(encoded.base64).toBe(data.toString('base64'));
    expect(encoded.raw).toBe(`data:image/png;base64,${data.toString('base64')}`);
  });

  it('encodes Uint8Array SVG bytes with the expected Data URI fields', async () => {
    const data = await readFile(fixturePath('test.svg'));
    const encoded = encodeBuffer(new Uint8Array(data), 'image/svg+xml');

    expect(encoded.mediaType).toBe('image/svg+xml');
    expect(encoded.category).toBe('image');
    expect(encoded.base64).toBe(Buffer.from(data).toString('base64'));
    expect(encoded.raw).toBe(`data:image/svg+xml;base64,${Buffer.from(data).toString('base64')}`);
  });

  it('rejects unsupported MIME types', () => {
    expect(() => encodeBuffer(Buffer.from('hello'), 'text/plain')).toThrow(/unsupported/i);
  });

  it('rejects empty buffers', () => {
    expect(() => encodeBuffer(Buffer.alloc(0), 'image/png')).toThrow(/empty|0 bytes/i);
  });
});
