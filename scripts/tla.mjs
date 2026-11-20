#!/usr/bin/env node
/**
 * Model-checks the TLA+ specs in spec/ with TLC.
 *
 * Needs only Node: the pinned TLA+ tools jar is downloaded once and checked against its
 * SHA-256, and when no Java 11+ is on the PATH, a pinned Temurin JRE is downloaded the
 * same way. Both are cached in node_modules/.cache/tlaplus.
 *
 *   pnpm spec:check                 # check every spec/MC*.tla with its .cfg
 *   pnpm spec:check MCReactivity    # check one
 *
 * Environment:
 *   TLA_JAVA=/path/to/java          use this java instead of looking for one
 *   TLA_DOWNLOAD_JAVA=1             always use the pinned JRE, even if java is installed
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { arch as osArch, platform as osPlatform } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_DIR = path.join(ROOT, 'spec');
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'tlaplus');

const TLA_TOOLS = {
  version: '1.7.4',
  url: 'https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar',
  sha256: '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88',
};
// Temurin release whose JRE is used when no suitable java is installed
const JRE_RELEASE = 'jdk-21.0.12+8';

function fail(message) {
  console.error(`spec:check: ${message}`);
  process.exit(1);
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

async function download(url, file, expectedSha256) {
  if (existsSync(file) && sha256(file) === expectedSha256) return;

  console.log(`Downloading ${url}`);

  const res = await fetch(url);

  if (!res.ok) fail(`download failed (${res.status}): ${url}`);

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));

  const actual = sha256(file);

  if (actual !== expectedSha256) {
    rmSync(file);
    fail(`checksum mismatch for ${url}: expected ${expectedSha256}, got ${actual}`);
  }
}

function javaMajor(java) {
  const out = spawnSync(java, ['-version'], { encoding: 'utf8' });

  if (out.error || out.status !== 0) return 0;

  const match = /version "(\d+)(?:\.(\d+))?/.exec(out.stderr || out.stdout);

  if (!match) return 0;

  // "1.8.0" is Java 8
  return match[1] === '1' ? Number(match[2]) : Number(match[1]);
}

function findJavaBin(dir) {
  const exe = osPlatform() === 'win32' ? 'java.exe' : 'java';
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === exe && path.basename(current) === 'bin') return full;
    }
  }

  return undefined;
}

async function downloadJre() {
  const os = { linux: 'linux', darwin: 'mac', win32: 'windows' }[osPlatform()];
  const architecture = { x64: 'x64', arm64: 'aarch64' }[osArch()];

  if (!os || !architecture) fail(`no pinned JRE for ${osPlatform()}/${osArch()}; install Java 11+ or set TLA_JAVA`);

  const dir = path.join(CACHE, `jre-${JRE_RELEASE}-${os}-${architecture}`);
  const cached = existsSync(dir) ? findJavaBin(dir) : undefined;

  if (cached) return cached;

  const api = `https://api.adoptium.net/v3/assets/release_name/eclipse/${encodeURIComponent(JRE_RELEASE)}`
    + `?image_type=jre&jvm_impl=hotspot&os=${os}&architecture=${architecture}`;
  const res = await fetch(api);

  if (!res.ok) fail(`could not look up the JRE (${res.status}): ${api}`);

  const binary = (await res.json()).binaries?.find((b) => b.image_type === 'jre');

  if (!binary) fail(`no ${JRE_RELEASE} JRE for ${os}/${architecture}`);

  const archive = path.join(CACHE, binary.package.name);

  await download(binary.package.link, archive, binary.package.checksum);
  mkdirSync(dir, { recursive: true });

  // tar reads .zip too on Windows 10+ (bsdtar)
  const untar = spawnSync('tar', ['-xf', archive, '-C', dir], { stdio: 'inherit' });

  if (untar.status !== 0) fail(`could not extract ${archive}`);

  rmSync(archive);

  const java = findJavaBin(dir);

  if (!java) fail(`no java binary in ${dir}`);

  return java;
}

async function resolveJava() {
  if (process.env.TLA_JAVA) return process.env.TLA_JAVA;

  if (!process.env.TLA_DOWNLOAD_JAVA && javaMajor('java') >= 11) return 'java';

  return downloadJre();
}

function specsToCheck(names) {
  const all = readdirSync(SPEC_DIR)
    .filter((file) => /^MC.*\.tla$/.test(file))
    .map((file) => file.replace(/\.tla$/, ''));

  if (names.length === 0) return all;

  for (const name of names) {
    if (!all.includes(name)) fail(`no spec/${name}.tla (have: ${all.join(', ')})`);
  }

  return names;
}

const specs = specsToCheck(process.argv.slice(2));
const jar = path.join(CACHE, `tla2tools-${TLA_TOOLS.version}.jar`);

await download(TLA_TOOLS.url, jar, TLA_TOOLS.sha256);

const java = await resolveJava();
let failed = false;

for (const spec of specs) {
  console.log(`\n=== ${spec}`);

  const result = spawnSync(java, [
    '-XX:+UseParallelGC',
    '-cp', jar,
    'tlc2.TLC',
    '-workers', 'auto',
    // keep TLC's state files out of the repo
    '-metadir', path.join(CACHE, 'states', spec),
    '-config', `${spec}.cfg`,
    `${spec}.tla`,
  ], { cwd: SPEC_DIR, stdio: 'inherit' });

  if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
