import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const fixturesDir = resolve(__dirname, 'fixtures');
const projectRoot = resolve(__dirname, '..');
const cliEntry = resolve(projectRoot, 'src', 'cli.ts');
const tempRoot = await mkdtemp(join(tmpdir(), 'data-uri-cli-tests-'));

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function fixturePath(fileName: string): string {
  return join(fixturesDir, fileName);
}

async function execCli(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const result = await execFileAsync(process.execPath, [cliEntry, ...args], {
      cwd: projectRoot,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    };
  } catch (error) {
    const failed = error as Error & {
      code?: number;
      stdout?: string;
      stderr?: string;
    };

    return {
      stdout: failed.stdout ?? '',
      stderr: failed.stderr ?? '',
      exitCode: failed.code ?? 1,
    };
  }
}

describe('CLI', () => {
  it('prints a PNG Data URI to stdout', async () => {
    const fixture = await readFile(fixturePath('test.png'));
    const result = await execCli([fixturePath('test.png')]);

    expect(result.stdout.trim()).toBe(`data:image/png;base64,${fixture.toString('base64')}`);
    expect(result.stderr).toBe('');
  });

  it('prints a JPEG Data URI to stdout', async () => {
    const fixture = await readFile(fixturePath('test.jpg'));
    const result = await execCli([fixturePath('test.jpg')]);

    expect(result.stdout.trim()).toBe(`data:image/jpeg;base64,${fixture.toString('base64')}`);
    expect(result.stderr).toBe('');
  });

  it('prints an SVG Data URI to stdout', async () => {
    const fixture = await readFile(fixturePath('test.svg'));
    const result = await execCli([fixturePath('test.svg')]);

    expect(result.stdout.trim()).toBe(`data:image/svg+xml;base64,${fixture.toString('base64')}`);
    expect(result.stderr).toBe('');
  });

  it('exits with code 0 for a successful invocation', async () => {
    const result = await execCli([fixturePath('test.png')]);

    expect(result.exitCode).toBe(0);
  });

  it('prints a usage message to stderr and exits with code 1 when no arguments are provided', async () => {
    const result = await execCli([]);

    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/usage/i);
    expect(result.exitCode).toBe(1);
  });

  it('prints an error to stderr and exits with code 1 for a nonexistent file', async () => {
    const result = await execCli([join(tempRoot, 'missing.png')]);

    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/(not exist|no such file|enoent|cannot find)/i);
    expect(result.exitCode).toBe(1);
  });

  it('prints an error to stderr and exits with code 1 for an unsupported extension', async () => {
    const unsupportedPath = join(tempRoot, 'unsupported.txt');
    await writeFile(unsupportedPath, 'plain text');

    const result = await execCli([unsupportedPath]);

    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/unsupported/i);
    expect(result.exitCode).toBe(1);
  });
});
