const { readFileSync } = require('node:fs');
const { transformSync } = require('esbuild');

require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'es2022',
    sourcemap: false,
    sourcefile: filename,
  });

  module._compile(code, filename);
};
