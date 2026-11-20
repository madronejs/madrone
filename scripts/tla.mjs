#!/usr/bin/env node
/**
 * Model-checks the TLA+ specs in spec/ with TLC.
 *
 * Needs Node and Java 11+. The pinned TLA+ tools jar is downloaded once, checked against
 * its SHA-256 and cached in node_modules/.cache/tlaplus. Java is not downloaded: install
 * it yourself (or use actions/setup-java in CI).
 *
 *   pnpm spec:check                 # check every spec/MC*.tla with its .cfg
 *   pnpm spec:check MCReactivity    # check one
 *
 * Environment:
 *   TLA_JAVA=/path/to/java          use this java instead of the one on the PATH
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync,
} from 'node:fs';
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

function fail(message) {
  console.error(`spec:check: ${message}`);
  process.exit(1);
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** Whether `file` exists with the expected hash (one read, so there is no check-then-use race) */
function isCached(file, expectedSha256) {
  try {
    return sha256(readFileSync(file)) === expectedSha256;
  } catch {
    return false;
  }
}

async function download(url, file, expectedSha256) {
  if (isCached(file, expectedSha256)) return;

  console.log(`Downloading ${url}`);

  const res = await fetch(url);

  if (!res.ok) fail(`download failed (${res.status}): ${url}`);

  const data = Buffer.from(await res.arrayBuffer());
  const actual = sha256(data);

  // verify before anything touches the disk
  if (actual !== expectedSha256) fail(`checksum mismatch for ${url}: expected ${expectedSha256}, got ${actual}`);

  // write to a temporary file and rename it, so a reader never sees a partial jar
  const temporary = `${file}.${process.pid}.tmp`;

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(temporary, data);
  renameSync(temporary, file);
}

function javaMajor(java) {
  const out = spawnSync(java, ['-version'], { encoding: 'utf8' });

  if (out.error || out.status !== 0) return 0;

  const match = /version "(\d+)(?:\.(\d+))?/.exec(out.stderr || out.stdout);

  if (!match) return 0;

  // "1.8.0" is Java 8
  return match[1] === '1' ? Number(match[2]) : Number(match[1]);
}

function resolveJava() {
  const java = process.env.TLA_JAVA || 'java';
  const major = javaMajor(java);

  if (major >= 11) return java;

  fail([
    major ? `${java} is Java ${major}; TLC needs Java 11+.` : `could not run ${java}; TLC needs Java 11+.`,
    'Install a JDK or JRE (e.g. `apt install openjdk-21-jre-headless`, `brew install openjdk`,',
    'or actions/setup-java in CI), or set TLA_JAVA=/path/to/java.',
  ].join('\n'));

  return undefined;
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

const java = resolveJava();

await download(TLA_TOOLS.url, jar, TLA_TOOLS.sha256);
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
