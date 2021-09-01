const { Generator } = require('npm-dts');
const { build } = require('esbuild');
const fse = require('fs-extra');
const semverInc = require('semver/functions/inc');
const path = require('path');

async function buildPackage({
  minify = false,
  incrementVersion = false,
  entry,
  packagePath,
  distPath,
} = {}) {
  console.log('start build...');

  const pkg = fse.readJsonSync(path.join(packagePath));
  const newVersion = semverInc(pkg.version, incrementVersion);
  const shared = {
    entryPoints: [entry],
    bundle: true,
    minify,
    external: Object.keys(pkg.dependencies || {}),
  };
  const newPkgName = path.join(distPath, 'package.json');

  if (newVersion) {
    console.log('bumping version:', newVersion);
    pkg.version = newVersion;
    fse.writeJsonSync(newPkgName, pkg, { spaces: 2 });
  }

  // format new package for npm
  pkg.main = 'index.js';
  pkg.module = 'index.esm.js';
  pkg.types = 'index.d.ts';
  delete pkg.devDependencies;
  delete pkg.scripts;

  const buildCJS = async () => {
    console.log('start cjs');
    await build({
      ...shared,
      outfile: path.join(distPath, pkg.main),
      format: 'cjs',
    });
    console.log('finish cjs!');
  };
  const buildESM = async () => {
    console.log('start esm');
    await build({
      ...shared,
      outfile: path.join(distPath, pkg.module),
      format: 'esm',
    });
    console.log('finish esm!');
  };
  const buildTypes = async () => {
    console.log('start types');
    await new Generator({
      entry,
      output: path.join(distPath, pkg.types),
    }).generate();
    console.log('building types!');
  };
  const writePkgJson = async () => {
    await fse.writeJson(newPkgName, pkg, { spaces: 2 });
    console.log('finish package.json!');
  };

  await Promise.all([buildCJS(), buildESM(), buildTypes(), writePkgJson()]);
  console.log('finish build!');
}

buildPackage({
  packagePath: './package.json',
  entry: './src/index.ts',
  distPath: './dist/',
});
