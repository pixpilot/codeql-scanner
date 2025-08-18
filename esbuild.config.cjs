const process = require('node:process');
const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: 'dist',
    format: 'esm',
    sourcemap: false,
    tsconfig: 'tsconfig.build.json',
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
