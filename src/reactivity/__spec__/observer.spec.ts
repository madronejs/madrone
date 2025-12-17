import { describe, it, expect } from 'vitest';
import { delay } from '@/test/util';
import Observer from '../Observer';
import Reactive from '../Reactive';

describe('Observer', () => {
  it('caches values if nothing observed', () => {
    let counter = 0;
    const obs = Observer({
      get: () => {
        counter += 1;

        return 'foo';
      },
    });

    expect(obs.value).toEqual('foo');
    expect(obs.value).toEqual('foo');
    expect(obs.value).toEqual('foo');
    expect(counter).toEqual(1);
  });

  it('does not break cache if same value assigned', () => {
    let counter = 0;
    const object = { test: true };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.test;
      },
    });

    expect(obs.value).toEqual(true);
    tracked.test = true;
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(1);
  });

  it('stops watching after "dispose"', () => {
    let counter = 0;
    const tracked = Reactive({ test: 0 });
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.test;
      },
    });

    expect(obs.value).toEqual(0);
    tracked.test += 1;
    expect(obs.value).toEqual(1);
    obs.dispose();
    tracked.test += 1;
    expect(obs.value).toEqual(undefined);
    expect(obs.value).toEqual(undefined);
    expect(counter).toEqual(2);
  });

  it('busts cache on nested observers', () => {
    let counter = 0;
    const object = { test: true };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => tracked.test,
    });
    const obs2 = Observer({
      get: () => {
        counter += 1;

        return obs.value;
      },
    });

    expect(obs2.value).toEqual(true);
    expect(obs2.value).toEqual(true);
    expect(counter).toEqual(1);
    tracked.test = false;
    expect(obs2.value).toEqual(false);
    expect(obs2.value).toEqual(false);
    expect(counter).toEqual(2);
  });

  it('does not bust cache if sibling in observer changed', () => {
    let counter = 0;
    const object = { test: true, sibling: 0 };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.test;
      },
    });

    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(1);
    tracked.sibling += 1;
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(1);
  });

  it('has callback when value observer changed', async () => {
    let counter = 0;
    const object = { test: null };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.test;
      },
      onChange: ({ value, prev }) => {
        newValues.push(value);
        oldValues.push(prev);
      },
    });

    expect(obs.value).toEqual(null);
    expect(counter).toEqual(1);
    tracked.test = false;
    expect(obs.value).toEqual(false);
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(2);
    await delay();
    tracked.test = true;
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(3);
    await delay();
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  it('only notifies change one time', async () => {
    let counter = 0;
    const object = { test: null };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.test;
      },
      onChange: ({ value, prev }) => {
        newValues.push(value);
        oldValues.push(prev);
      },
    });

    expect(obs.value).toEqual(null);
    expect(counter).toEqual(1);
    tracked.test = 'foo';
    tracked.test = 'bar';
    tracked.test = false;
    expect(obs.value).toEqual(false);
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(2);
    await delay();
    tracked.test = 'foo';
    tracked.test = 'bar';
    tracked.test = true;
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(3);
    await delay();
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  it('has callback when value nested observer changed', async () => {
    let counter = 0;
    const object = { test: null };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];
    const obs = Observer({
      get: () => tracked.test,
    });
    const obs2 = Observer({
      get: () => {
        counter += 1;

        return obs.value;
      },
      onChange: ({ value, prev }) => {
        newValues.push(value);
        oldValues.push(prev);
      },
    });

    expect(obs2.value).toEqual(null);
    expect(counter).toEqual(1);
    tracked.test = false;
    expect(obs2.value).toEqual(false);
    expect(obs2.value).toEqual(false);
    expect(counter).toEqual(2);
    await delay();
    tracked.test = true;
    expect(obs2.value).toEqual(true);
    expect(obs2.value).toEqual(true);
    expect(counter).toEqual(3);
    await delay();
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  describe('error handling', () => {
    it('propagates errors from getter', () => {
      const obs = Observer({
        get: () => {
          throw new Error('getter error');
        },
      });

      expect(() => obs.value).toThrow('getter error');
    });

    it('does not get stuck in dirty state after error', () => {
      let shouldThrow = true;
      let callCount = 0;
      const obs = Observer({
        get: () => {
          callCount += 1;

          if (shouldThrow) {
            throw new Error('temporary error');
          }

          return 'success';
        },
      });

      // First access throws
      expect(() => obs.value).toThrow('temporary error');
      expect(callCount).toEqual(1);

      // Subsequent access should return cached value (undefined), not retry
      shouldThrow = false;
      expect(obs.value).toBeUndefined();
      expect(callCount).toEqual(1); // Not called again because dirty was reset
    });

    it('recovers when dependencies change after error', () => {
      const tracked = Reactive({ shouldThrow: true });
      let callCount = 0;
      const obs = Observer({
        get: () => {
          callCount += 1;

          if (tracked.shouldThrow) {
            throw new Error('conditional error');
          }

          return 'success';
        },
      });

      // First access throws
      expect(() => obs.value).toThrow('conditional error');
      expect(callCount).toEqual(1);

      // Change dependency - should mark dirty again
      tracked.shouldThrow = false;

      // Now it should work
      expect(obs.value).toEqual('success');
      expect(callCount).toEqual(2);
    });

    it('does not corrupt observer stack on error', () => {
      const tracked = Reactive({ value: 1 });

      const failingObs = Observer({
        get: () => {
          throw new Error('fail');
        },
      });

      const workingObs = Observer({
        get: () => tracked.value * 2,
      });

      // Failing observer throws
      expect(() => failingObs.value).toThrow('fail');

      // Working observer should still work correctly
      expect(workingObs.value).toEqual(2);
      tracked.value = 5;
      expect(workingObs.value).toEqual(10);
    });
  });
});
