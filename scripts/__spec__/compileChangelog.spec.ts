// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  afterEach, beforeEach, describe, expect, it,
} from 'vitest';

const SCRIPT = fileURLToPath(new URL('../compile-changelog.mjs', import.meta.url));

const BASE_CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-01

### Added

- Initial release
`;

describe('compile-changelog', () => {
  let root: string;
  let unreleasedDir: string;

  function writeFixture({ version = '1.1.0', changelog = BASE_CHANGELOG } = {}) {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version }));
    writeFileSync(join(root, 'CHANGELOG.md'), changelog);
  }

  function writeFragment(name: string, content: string) {
    writeFileSync(join(unreleasedDir, name), content);
  }

  function run(...args: string[]) {
    return execFileSync(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, CHANGELOG_ROOT: root },
      encoding: 'utf8',
    });
  }

  function runExpectingFailure(...args: string[]) {
    try {
      run(...args);
    } catch (error) {
      return error as { status: number, stderr: string };
    }

    throw new Error('expected the script to exit non-zero');
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'compile-changelog-'));
    unreleasedDir = join(root, 'changelog', 'unreleased');
    mkdirSync(unreleasedDir, { recursive: true });
    writeFixture();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('compiles fragments into a new section and deletes them', () => {
    writeFragment('fix-a.md', '---\ntype: Fixed\ntext: "Fixed a thing."\n---\n');
    writeFragment('add-b.md', '---\ntype: Added\ntext: Added a thing\n---\n');
    writeFragment('README.md', 'not a fragment');

    run();

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    const today = new Date().toISOString().slice(0, 10);

    expect(changelog).toContain(`## [1.1.0] - ${today}`);
    expect(changelog).toContain('### Added\n\n- Added a thing');
    expect(changelog).toContain('### Fixed\n\n- Fixed a thing.');
    // new section goes above the previous release
    expect(changelog.indexOf('## [1.1.0]')).toBeLessThan(changelog.indexOf('## [1.0.0]'));
    // fragments are deleted, README survives
    expect(readdirSync(unreleasedDir)).toEqual(['README.md']);
  });

  it('orders sections Breaking first and Security last', () => {
    writeFragment('a.md', 'type: Security\ntext: sec');
    writeFragment('b.md', 'type: Breaking\ntext: brk');
    writeFragment('c.md', 'type: Fixed\ntext: fix');

    run();

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

    expect(changelog.indexOf('### Breaking')).toBeLessThan(changelog.indexOf('### Fixed'));
    expect(changelog.indexOf('### Fixed')).toBeLessThan(changelog.indexOf('### Security'));
  });

  it('groups multiple fragments of the same type into one section', () => {
    writeFragment('a.md', 'type: Fixed\ntext: first fix');
    writeFragment('b.md', 'type: Fixed\ntext: second fix');

    run();

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

    expect(changelog).toContain('### Fixed\n\n- first fix\n- second fix');
    expect(changelog.match(/### Fixed/g)).toHaveLength(1);
  });

  it('accepts case-insensitive types and unquoted text', () => {
    writeFragment('a.md', 'type: fixed\ntext: no quotes here');

    run();

    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toContain('### Fixed\n\n- no quotes here');
  });

  it('--dry-run prints the section without modifying anything', () => {
    writeFragment('a.md', 'type: Fixed\ntext: dry run entry');

    const stdout = run('--dry-run');

    expect(stdout).toContain('- dry run entry');
    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toBe(BASE_CHANGELOG);
    expect(readdirSync(unreleasedDir)).toEqual(['a.md']);
  });

  it('fails when there are no fragments', () => {
    const error = runExpectingFailure();

    expect(error.status).toBe(1);
    expect(error.stderr).toContain('no changelog fragments found');
  });

  it('fails when the version already has a changelog section', () => {
    writeFixture({ version: '1.0.0' });
    writeFragment('a.md', 'type: Fixed\ntext: something');

    const error = runExpectingFailure();

    expect(error.status).toBe(1);
    expect(error.stderr).toContain('already has a section for 1.0.0');
  });

  it('--dry-run previews as the next patch version when the current one is already released', () => {
    writeFixture({ version: '1.0.0' });
    writeFragment('a.md', 'type: Fixed\ntext: something');

    const stdout = run('--dry-run');

    expect(stdout).toContain('1.0.0 is already released; previewing as 1.0.1');
    expect(stdout).toContain('## [1.0.1]');
    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toBe(BASE_CHANGELOG);
    expect(readdirSync(unreleasedDir)).toEqual(['a.md']);
  });

  it('fails on an unknown type', () => {
    writeFragment('a.md', 'type: Improved\ntext: something');

    const error = runExpectingFailure();

    expect(error.status).toBe(1);
    expect(error.stderr).toContain('"type" must be one of');
    expect(error.stderr).toContain('Improved');
  });

  it('fails on missing text', () => {
    writeFragment('a.md', 'type: Fixed');

    const error = runExpectingFailure();

    expect(error.status).toBe(1);
    expect(error.stderr).toContain('missing or empty "text"');
  });
});
