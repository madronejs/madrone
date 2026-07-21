#!/usr/bin/env node
// Compiles changelog fragments from changelog/unreleased/ into CHANGELOG.md.
//
// Each fragment is a markdown file containing a single entry:
//
//   ---
//   type: Fixed
//   text: "description"
//   ---
//
// The new section's version comes from package.json and the date is today.
// Compiled fragments are deleted. Usage:
//
//   node scripts/compile-changelog.mjs [--dry-run]
//
// CHANGELOG_ROOT overrides the repo root (used by the spec to run against fixtures).

import {
  readFileSync, writeFileSync, readdirSync, unlinkSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CHANGELOG_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const UNRELEASED_DIR = join(ROOT, 'changelog', 'unreleased');
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

const TYPE_ORDER = ['Breaking', 'Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

const dryRun = process.argv.includes('--dry-run');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseFragment(name, content) {
  const fields = {};

  for (const line of content.split('\n')) {
    const match = /^(\w+):\s*(.*)$/.exec(line.trim());

    if (match) fields[match[1].toLowerCase()] = match[2].trim();
  }

  const type = TYPE_ORDER.find((t) => t.toLowerCase() === (fields.type ?? '').toLowerCase());
  let text = fields.text ?? '';

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }

  if (!type) fail(`${name}: "type" must be one of ${TYPE_ORDER.join(', ')} (got "${fields.type ?? ''}")`);

  if (!text) fail(`${name}: missing or empty "text"`);

  return { type, text };
}

const files = readdirSync(UNRELEASED_DIR)
  .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
  .sort();

if (files.length === 0) fail(`no changelog fragments found in ${UNRELEASED_DIR}`);

const fragments = files.map((name) => ({
  name,
  ...parseFragment(name, readFileSync(join(UNRELEASED_DIR, name), 'utf8')),
}));

const pkgVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
let version = pkgVersion;

if (changelog.includes(`## [${version}]`)) {
  if (!dryRun) fail(`CHANGELOG.md already has a section for ${version}; bump the version in package.json first`);

  // preview against the next patch version so --dry-run works without a bump
  version = version.replace(/\d+$/, (patch) => Number(patch) + 1);
  console.log(`--dry-run: ${pkgVersion} is already released; previewing as ${version}\n`);
}

const date = new Date().toISOString().slice(0, 10);
const sections = TYPE_ORDER
  .map((type) => {
    const entries = fragments.filter((f) => f.type === type);

    if (entries.length === 0) return null;

    return `### ${type}\n\n${entries.map((f) => `- ${f.text}`).join('\n')}`;
  })
  .filter(Boolean);
const newSection = `## [${version}] - ${date}\n\n${sections.join('\n\n')}\n`;

const firstSectionIndex = changelog.search(/^## \[/m);

const updated = firstSectionIndex === -1
  ? `${changelog.trimEnd()}\n\n${newSection}`
  : `${changelog.slice(0, firstSectionIndex)}${newSection}\n${changelog.slice(firstSectionIndex)}`;

if (dryRun) {
  console.log(`--dry-run: would add to CHANGELOG.md and delete ${files.length} fragment(s):\n`);
  console.log(newSection);
  process.exit(0);
}

writeFileSync(CHANGELOG_PATH, updated);

for (const name of files) unlinkSync(join(UNRELEASED_DIR, name));

console.log(`CHANGELOG.md: added [${version}] - ${date} (${fragments.length} entries from ${files.length} fragments)`);
