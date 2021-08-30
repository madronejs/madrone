const esbuild = require('esbuild');

const devMode = process.env.DEV === 'true' || false;
const config = {
  entryPoints: ['./src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  sourcemap: true,
  target: 'es2018',
};

if (devMode) {
  Object.assign(config, {
    watch: {
      onRebuild(error, result) {
        if (error) {
          console.error('watch build failed:', error);
        } else {
          console.log('watch build succeeded:', result.errors, result.warnings);
        }
      },
    },
    minify: false,
  });
}

esbuild
  .build(config)
  .then(() => {
    console.log('Build started');
  })
  .catch(() => process.exit(1));
