import { encodeFile } from './index';

const USAGE_MESSAGE = 'Usage: tsx src/cli.ts <file-path>';

/**
 * Writes a single-line message to stderr.
 *
 * @param message - Message to print
 */
function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Runs the CLI and returns the intended process exit code.
 *
 * @returns Exit code for the current invocation
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    writeError(USAGE_MESSAGE);
    return 1;
  }

  try {
    const encoded = await encodeFile(args[0]);
    process.stdout.write(`${encoded.raw}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    writeError(`Error: ${message}`);
    return 1;
  }
}

void main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch(() => {
    writeError('Error: Unexpected failure');
    process.exitCode = 1;
  });
