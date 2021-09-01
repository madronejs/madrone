const { Generator } = require('npm-dts');
const { build } = require('esbuild');
const pkg = require('./package.json');

async function buildPackage({ minify = false } = {}) {
  console.log('start build...');

  const entry = './src/index.ts';
  const shared = {
    entryPoints: [entry],
    bundle: true,
    minify,
    external: Object.keys(pkg.dependencies || {}),
  };

  const buildCJS = async () => {
    console.log('start cjs');
    await build({
      ...shared,
      outfile: pkg.main,
      format: 'cjs',
    });
    console.log('finish cjs!');
  };
  const buildESM = async () => {
    console.log('start esm');
    await build({
      ...shared,
      outfile: pkg.module,
      format: 'esm',
    });
    console.log('finish esm!');
  };
  const buildTypes = async () => {
    console.log('start types');
    await new Generator({
      entry,
      output: pkg.types,
    }).generate();
    console.log('building types!');
  };

  await Promise.all([buildCJS(), buildESM(), buildTypes()]);
  console.log('finish build!');
}

buildPackage({ minify: true });
