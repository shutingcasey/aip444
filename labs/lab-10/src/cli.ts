// @ts-nocheck
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { transformSync } = require('esbuild');

const usageMessage = `Usage: node ${join('src', 'cli.ts')} <file-path>`;

require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const transpiled = transformSync(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'es2022',
    sourcemap: false,
    sourcefile: filename,
  });

  module._compile(transpiled.code, filename);
};

/**
 * Writes a single-line message to stderr.
 *
 * @param {string} message - Message to print
 */
function writeError(message) {
  process.stderr.write(`${message}\n`);
}

/**
 * Runs the CLI and returns the intended process exit code.
 *
 * @returns {Promise<number>} Exit code for the current invocation
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    writeError(usageMessage);
    return 1;
  }

  try {
    const { encodeFile } = require('./index.ts');
    const encoded = await encodeFile(args[0]);
    process.stdout.write(encoded.raw);
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
