import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { parseDataURI, decodeToBuffer, decodeToFile } from '../src/decode';
import { encodeFile } from '../src/encode';
import type { MediaType } from '../src/types';
import { getCategory } from '../src/types';

const fixturesDir = resolve(__dirname, 'fixtures');
const tempRoot = await mkdtemp(join(tmpdir(), 'data-uri-decode-tests-'));

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function fixturePath(fileName: string): string {
  return join(fixturesDir, fileName);
}

async function buildFixtureDataURI(fileName: string, mediaType: MediaType) {
  const data = await readFile(fixturePath(fileName));
  const base64 = data.toString('base64');
  const raw = `data:${mediaType};base64,${base64}`;

  return {
    raw,
    base64,
    data,
    mediaType,
    category: getCategory(mediaType),
  };
}

describe('parseDataURI', () => {
  it('parses a PNG Data URI into its components', async () => {
    const expected = await buildFixtureDataURI('test.png', 'image/png');
    const parsed = parseDataURI(expected.raw);

    expect(parsed.mediaType).toBe(expected.mediaType);
    expect(parsed.category).toBe(expected.category);
    expect(parsed.base64).toBe(expected.base64);
    expect(parsed.raw).toBe(expected.raw);
  });

  it('parses an SVG Data URI into its components', async () => {
    const expected = await buildFixtureDataURI('test.svg', 'image/svg+xml');
    const parsed = parseDataURI(expected.raw);

    expect(parsed.mediaType).toBe(expected.mediaType);
    expect(parsed.category).toBe(expected.category);
    expect(parsed.base64).toBe(expected.base64);
    expect(parsed.raw).toBe(expected.raw);
  });

  it.each([
    'image/png;base64,iVBORw0KGgo=',
    'data:;base64,iVBORw0KGgo=',
    'data:image/png,iVBORw0KGgo=',
    'data:image/png;base64iVBORw0KGgo=',
    'data:image/png;base64,',
  ])('rejects malformed Data URIs: %s', (uri) => {
    expect(() => parseDataURI(uri)).toThrow(/invalid|malformed|data uri|base64/i);
  });

  it('rejects unsupported MIME types', () => {
    expect(() => parseDataURI('data:text/plain;base64,SGVsbG8=')).toThrow(/unsupported|mime/i);
  });

  it('rejects invalid Base64 content', () => {
    expect(() => parseDataURI('data:image/png;base64,%%%not-base64%%%')).toThrow(
      /invalid|base64/i,
    );
  });
});

describe('decodeToBuffer', () => {
  it('decodes a valid PNG Data URI back into the original bytes', async () => {
    const expected = await buildFixtureDataURI('test.png', 'image/png');
    const decoded = decodeToBuffer(expected.raw);

    expect(decoded.equals(expected.data)).toBe(true);
  });

  it('decodes a valid MP3 Data URI back into the original bytes', async () => {
    const expected = await buildFixtureDataURI('test.mp3', 'audio/mpeg');
    const decoded = decodeToBuffer(expected.raw);

    expect(decoded.equals(expected.data)).toBe(true);
  });

  it('supports encode/decode round-trip behavior', async () => {
    const filePath = fixturePath('test.jpg');
    const original = await readFile(filePath);
    const encoded = await encodeFile(filePath);
    const decoded = decodeToBuffer(encoded.raw);

    expect(decoded.equals(original)).toBe(true);
  });

  it('rejects malformed Data URIs', () => {
    expect(() => decodeToBuffer('not-a-data-uri')).toThrow(/invalid|malformed|data uri/i);
  });

  it('rejects invalid Base64 content', () => {
    expect(() => decodeToBuffer('data:image/png;base64,%%%not-base64%%%')).toThrow(
      /invalid|base64/i,
    );
  });
});

describe('decodeToFile', () => {
  it('writes decoded bytes to the requested file path', async () => {
    const expected = await buildFixtureDataURI('test.png', 'image/png');
    const outputPath = join(tempRoot, 'decoded-test.png');

    await decodeToFile(expected.raw, outputPath);

    const written = await readFile(outputPath);
    expect(written.equals(expected.data)).toBe(true);
  });

  it('propagates invalid URI failures', async () => {
    const outputPath = join(tempRoot, 'invalid-output.png');

    await expect(decodeToFile('data:image/png;base64,%%%not-base64%%%', outputPath)).rejects.toThrow(
      /invalid|base64/i,
    );
  });
});
