/**
 * Model-based test: random programs of writes, computed reads, watchers, releases and
 * garbage collections run against the real reactivity system and against a reference
 * model that recomputes everything from scratch. Any divergence is a bug in the
 * dependency tracking, caching, weak/strong holding or scheduling. Watchers may let
 * their target's error through (so creating one can throw) and may stop themselves from
 * inside their own getter, and no disposed observer may stay subscribed to anything.
 *
 * The same rules are written as a TLA+ spec in spec/Reactivity.tla.
 */
import fc from 'fast-check';
import {
  describe, it, expect, vi,
} from 'vitest';
import { collect } from '@/test/collect';
import Computed from '../Computed';
import Reactive from '../Reactive';
import Watcher from '../Watcher';
import { getObservers } from '../global';
import type { ObservableItem } from '../Observer';

const SOURCES = 3;
// several sources share key names, like every @reactive atom uses `value`
const KEYS = ['value', 'a', 'b'] as const;
// indexes wrap around what exists, so a small range keeps ops hitting the same few items
const MAX_INDEX = 4;

type Key = typeof KEYS[number];
type Read = { kind: 'source', source: number, key: Key } | { kind: 'computed', index: number };
/**
 * A computed reads `cond`, then sums `odd` or `even` depending on its parity. With
 * `isThrowing` it throws instead when `cond` is odd; with `isCatching` an error from a
 * computed it reads counts as 0, otherwise the error propagates.
 */
type Program = { cond: Read, odd: Read[], even: Read[], isThrowing: boolean, isCatching: boolean };
/** What reading something gives: a value, or that it threw */
type Outcome = number | 'error';
/**
 * `isCatching` watchers see an error as a value; the others let it through, so the
 * scheduler logs it and their handler isn't called. `isStopping` makes the getter call
 * the watcher's own disposer on its next run, before reading the target.
 */
type WatcherRecord = {
  target: Read,
  seen: Outcome,
  isCatching: boolean,
  stop?: () => void,
  isStopping?: boolean,
  isStopped?: boolean,
};

type Op = | { op: 'write', source: number, key: Key, value: number }
  | { op: 'create', program: Program, isWeak: boolean }
  | { op: 'read', index: number }
  | { op: 'watch', target: Read, isKept: boolean, isCatching: boolean }
  | { op: 'unwatch', index: number }
  | { op: 'stopInRun', index: number }
  | { op: 'release', index: number }
  | { op: 'flush' }
  | { op: 'gc' };

const sourceReadArb = fc.record({
  kind: fc.constant('source' as const),
  source: fc.nat(SOURCES - 1),
  key: fc.constantFrom(...KEYS),
});
const computedReadArb = fc.record({ kind: fc.constant('computed' as const), index: fc.nat(MAX_INDEX) });
const readArb = fc.oneof(
  { weight: 3, arbitrary: sourceReadArb },
  { weight: 2, arbitrary: computedReadArb }
) as fc.Arbitrary<Read>;
const readsArb = fc.array(readArb, { maxLength: 3 });
const programArb = fc.record({
  cond: readArb, odd: readsArb, even: readsArb, isThrowing: fc.boolean(), isCatching: fc.boolean(),
});

// without strictNullChecks fc.record's fields come out optional, hence the cast
const opArb = fc.oneof(
  {
    weight: 6,
    arbitrary: fc.record({
      op: fc.constant('write' as const),
      source: fc.nat(SOURCES - 1),
      key: fc.constantFrom(...KEYS),
      value: fc.integer({ min: 0, max: 5 }),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      op: fc.constant('create' as const),
      program: programArb,
      isWeak: fc.boolean(),
    }),
  },
  { weight: 4, arbitrary: fc.record({ op: fc.constant('read' as const), index: fc.nat(MAX_INDEX) }) },
  {
    weight: 3,
    arbitrary: fc.record({
      op: fc.constant('watch' as const), target: readArb, isKept: fc.boolean(), isCatching: fc.boolean(),
    }),
  },
  { weight: 1, arbitrary: fc.record({ op: fc.constant('unwatch' as const), index: fc.nat(MAX_INDEX) }) },
  { weight: 1, arbitrary: fc.record({ op: fc.constant('stopInRun' as const), index: fc.nat(MAX_INDEX) }) },
  { weight: 3, arbitrary: fc.record({ op: fc.constant('release' as const), index: fc.nat(MAX_INDEX) }) },
  { weight: 2, arbitrary: fc.constant({ op: 'flush' as const }) },
  { weight: 3, arbitrary: fc.constant({ op: 'gc' as const }) }
) as fc.Arbitrary<Op>;

const flush = () => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

const ERROR = 'error' as const;

const outcome = (read: () => number): Outcome => {
  try {
    return read();
  } catch {
    return ERROR;
  }
};

async function runProgram(ops: Op[]) {
  // reference model: plain state, and each computed's program over earlier computeds
  const model = Array.from({ length: SOURCES }, () => ({ value: 0, a: 0, b: 0 }));
  const programs: Program[] = [];

  function evalComputed(index: number): Outcome {
    const {
      cond, odd, even, isThrowing, isCatching,
    } = programs[index];

    const readIn = (read: Read): Outcome => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const value = evalRead(read);

      return value === ERROR && isCatching ? 0 : value;
    };
    const condValue = readIn(cond);

    if (condValue === ERROR || (condValue % 2 && isThrowing)) return ERROR;

    const branch = condValue % 2 ? odd : even;
    let total = 0;

    for (const read of branch) {
      const value = readIn(read);

      if (value === ERROR) return ERROR;

      total += value;
    }

    return total;
  }

  function evalRead(read: Read): Outcome {
    return read.kind === 'source' ? model[read.source][read.key] : evalComputed(read.index);
  }

  // the real thing; `held` is what the test (the "owner") still references
  const sources = Array.from({ length: SOURCES }, () => Reactive({ value: 0, a: 0, b: 0 }));
  const held: Array<ObservableItem<number> | undefined> = [];
  // a watcher whose disposer was dropped must keep firing, so only kept ones get a `stop`
  const watchers: Array<WatcherRecord | undefined> = [];
  // watchers whose creation threw: the caller has no disposer, so their handler must never run
  const failed: WatcherRecord[] = [];

  // a computed can only read computeds that existed and were held when it was created
  const resolve = (read: Read): Read | undefined => {
    if (read.kind === 'source') return read;

    if (held.length === 0) return undefined;

    const index = read.index % held.length;

    return held[index] ? { kind: 'computed', index } : undefined;
  };
  // capture the computed itself, not the `held` slot, so releasing it doesn't break readers
  const reader = (read: Read): (() => number) => {
    if (read.kind === 'source') {
      const source = sources[read.source];

      return () => source[read.key];
    }

    const cp = held[read.index];

    return () => cp.value;
  };
  const resolveAll = (reads: Read[]) => reads.map((read) => resolve(read)).filter(Boolean);
  const readerAll = (reads: Read[]) => reads.map((read) => reader(read));

  const create = (step: Extract<Op, { op: 'create' }>) => {
    const { isThrowing, isCatching } = step.program;
    const cond = resolve(step.program.cond) ?? { kind: 'source', source: 0, key: 'value' };
    const program = {
      cond, odd: resolveAll(step.program.odd), even: resolveAll(step.program.even), isThrowing, isCatching,
    };
    const readCond = reader(program.cond);
    const readOdd = readerAll(program.odd);
    const readEven = readerAll(program.even);
    // a caught error counts as 0; otherwise it propagates out of this getter
    const readIn = (read: () => number) => {
      if (!isCatching) return read();

      const value = outcome(read);

      return value === ERROR ? 0 : value;
    };

    programs.push(program);
    held.push(Computed<number>({
      weak: step.isWeak,
      get: () => {
        const condValue = readIn(readCond);

        if (condValue % 2 && isThrowing) throw new Error('thrown');

        return (condValue % 2 ? readOdd : readEven).reduce((total, read) => total + readIn(read), 0);
      },
    }));
  };

  const watch = (step: Extract<Op, { op: 'watch' }>) => {
    const target = resolve(step.target);

    if (!target) return;

    const read = reader(target);
    const watcher: WatcherRecord = { target, seen: undefined, isCatching: step.isCatching };
    const get = () => {
      if (watcher.isStopping) {
        watcher.isStopped = true;
        watcher.stop();
      }

      return watcher.isCatching ? outcome(read) : read();
    };
    const expected = evalRead(target);
    let stop: () => void;

    try {
      stop = Watcher(get, (value) => {
        watcher.seen = value;
      }, { immediate: true });
    } catch {
      expect(expected, 'only a watcher that lets an error through throws').toEqual(ERROR);
      expect(step.isCatching).toEqual(false);
      watcher.seen = undefined;
      failed.push(watcher);

      return;
    }

    expect(step.isCatching || expected !== ERROR, 'a watcher that lets an error through throws').toEqual(true);

    if (step.isKept) watcher.stop = stop;

    watchers.push(watcher);
  };

  // Ops run in a synchronous function: a suspended async function keeps its locals alive
  // across `await`, which would root the very objects the gc steps should collect.
  const apply = (step: Op): void => {
    switch (step.op) {
      case 'write': {
        sources[step.source][step.key] = step.value;
        model[step.source][step.key] = step.value;
        break;
      }
      case 'create': {
        create(step);
        break;
      }
      case 'read': {
        const index = step.index % Math.max(held.length, 1);

        if (held[index]) expect(outcome(() => held[index].value), `computed ${index}`).toEqual(evalComputed(index));

        break;
      }
      case 'watch': {
        watch(step);
        break;
      }
      case 'unwatch': {
        const index = step.index % Math.max(watchers.length, 1);

        watchers[index]?.stop?.();

        if (watchers[index]?.stop) watchers[index] = undefined;

        break;
      }
      case 'stopInRun': {
        // only a watcher whose disposer is kept can call it from its getter
        const watcher = watchers[step.index % Math.max(watchers.length, 1)];

        if (watcher?.stop) watcher.isStopping = true;

        break;
      }
      case 'release': {
        if (held.length > 0) held[step.index % held.length] = undefined;

        break;
      }
      default: {
        throw new Error(`unknown op ${step.op}`);
      }
    }
  };

  for (const step of ops) {
    if (step.op === 'flush') {
      await flush();
    } else if (step.op === 'gc') {
      await collect();
    } else {
      apply(step);
    }
  }

  // Collect, then change every source: a watcher (or anything it reads) that was wrongly
  // collected misses this change, whatever order the program did things in.
  await collect();

  for (const index of sources.keys()) {
    for (const key of KEYS) {
      apply({
        op: 'write', source: index, key, value: model[index][key] + 1,
      });
    }
  }

  // once changes have been delivered, every live watcher has seen the current value
  await flush();

  for (const [index, watcher] of watchers.entries()) {
    const expected = watcher && !watcher.isStopped ? evalRead(watcher.target) : undefined;

    // a watcher that lets an error through doesn't call its handler with it
    if (expected !== undefined && (expected !== ERROR || watcher.isCatching)) {
      expect(watcher.seen, `watcher ${index}`).toEqual(expected);
    }
  }

  for (const watcher of failed) expect(watcher.seen, 'a watcher whose creation threw').toBeUndefined();

  // no disposed observer is still subscribed to a source or a computed
  const visited = new Set<object>();
  const queue: object[] = [...sources];

  while (queue.length > 0) {
    const observerSets = [...(getObservers(queue.pop())?.values() ?? [])];
    // collected weak observers deref to undefined
    const subscribed = observerSets
      .flatMap((entries) => [...entries])
      .map((entry) => (entry instanceof WeakRef ? entry.deref() : entry))
      .filter(Boolean);

    for (const obs of subscribed) {
      expect(obs.alive, 'a subscribed observer').toEqual(true);

      if (!visited.has(obs)) queue.push(obs);

      visited.add(obs);
    }
  }

  for (const [index, cp] of held.entries()) {
    if (cp) expect(outcome(() => cp.value), `computed ${index}`).toEqual(evalComputed(index));
  }
}

describe('reactivity model', () => {
  it('matches a from-scratch model for random programs', async () => {
    // watchers that let an error through make the scheduler log it
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // a watcher on a weak computed nothing else references, after a gc (regression)
    const unreferencedComputedWatched: Op[] = [
      {
        op: 'create',
        program: {
          cond: { kind: 'source', source: 0, key: 'a' },
          odd: [],
          even: [{ kind: 'source', source: 0, key: 'value' }],
          isThrowing: false,
          isCatching: false,
        },
        isWeak: true,
      },
      {
        op: 'watch', target: { kind: 'computed', index: 0 }, isKept: false, isCatching: true,
      },
      { op: 'release', index: 0 },
      { op: 'gc' },
      {
        op: 'write', source: 0, key: 'value', value: 3,
      },
    ];

    // a watcher on a throwing computed that lets the error through, so creating it throws;
    // the ending's writes make the computed recover (regression)
    const watcherThrowsOnCreate: Op[] = [
      {
        op: 'write', source: 0, key: 'a', value: 1,
      },
      {
        op: 'create',
        program: {
          cond: { kind: 'source', source: 0, key: 'a' },
          odd: [],
          even: [],
          isThrowing: true,
          isCatching: false,
        },
        isWeak: false,
      },
      {
        op: 'watch', target: { kind: 'computed', index: 0 }, isKept: false, isCatching: false,
      },
    ];

    try {
      await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 40 }), runProgram), {
        numRuns: 300,
        examples: [[unreferencedComputedWatched], [watcherThrowsOnCreate]],
      });
    } finally {
      consoleError.mockRestore();
    }
  }, 120_000);
});
