const process = require('node:process');
const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: 'dist',
    format: 'cjs', // Changed from 'esm' to 'cjs'
    external: ['string_decoder', 'fs', 'path', 'os', 'util', 'stream'], // Mark Node built-ins as external
    sourcemap: false,
    tsconfig: 'tsconfig.build.json',
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
