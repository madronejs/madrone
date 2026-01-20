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

  describe('dependency cleanup', () => {
    it('clears stale dependencies when they change dynamically', () => {
      let aAccessCount = 0;
      let bAccessCount = 0;

      const state = Reactive({
        useA: true,
        get a() {
          aAccessCount += 1;
          return 1;
        },
        get b() {
          bAccessCount += 1;
          return 2;
        },
      });

      const obs = Observer({
        get: () => (state.useA ? state.a : state.b),
      });

      // First run: depends on useA and a
      expect(obs.value).toEqual(1);
      expect(aAccessCount).toEqual(1);
      expect(bAccessCount).toEqual(0);

      // Change to use b instead
      state.useA = false;
      expect(obs.value).toEqual(2);
      expect(aAccessCount).toEqual(1);
      expect(bAccessCount).toEqual(1);

      // Now changing a should NOT trigger recomputation
      // (if deps were cleaned, a is no longer tracked)
      aAccessCount = 0;
      bAccessCount = 0;

      // Access value to confirm it's cached
      expect(obs.value).toEqual(2);
      expect(aAccessCount).toEqual(0);
      expect(bAccessCount).toEqual(0);
    });

    it('does not retain references to unused reactive objects', () => {
      const state1 = Reactive({ value: 1 });
      const state2 = Reactive({ value: 2 });
      const switcher = Reactive({ useFirst: true });

      const obs = Observer({
        get: () => (switcher.useFirst ? state1.value : state2.value),
      });

      // First run: depends on switcher and state1
      expect(obs.value).toEqual(1);

      // Switch to state2
      switcher.useFirst = false;
      expect(obs.value).toEqual(2);

      // Changing state1 should not affect the observer anymore
      let recomputeCount = 0;
      const obs2 = Observer({
        get: () => {
          recomputeCount += 1;
          return obs.value;
        },
      });

      expect(obs2.value).toEqual(2);
      expect(recomputeCount).toEqual(1);

      // state1 change should not trigger obs or obs2
      state1.value = 100;
      expect(obs2.value).toEqual(2);
      expect(recomputeCount).toEqual(1);

      // state2 change should trigger both
      state2.value = 200;
      expect(obs2.value).toEqual(200);
      expect(recomputeCount).toEqual(2);
    });
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

  describe('cache: false', () => {
    it('recomputes value on every access when cache is false', () => {
      let counter = 0;
      const obs = Observer({
        cache: false,
        get: () => {
          counter += 1;
          return 'value';
        },
      });

      expect(obs.value).toEqual('value');
      expect(obs.value).toEqual('value');
      expect(obs.value).toEqual('value');
      expect(counter).toEqual(3);
    });

    it('still tracks dependencies with cache false', () => {
      let counter = 0;
      const tracked = Reactive({ value: 1 });
      const obs = Observer({
        cache: false,
        get: () => {
          counter += 1;
          return tracked.value * 2;
        },
      });

      expect(obs.value).toEqual(2);
      expect(counter).toEqual(1);

      tracked.value = 5;
      expect(obs.value).toEqual(10);
      expect(counter).toEqual(2);
    });

    it('calls onChange when dependencies change with cache false', async () => {
      const tracked = Reactive({ value: 1 });
      let changeCount = 0;
      const obs = Observer({
        cache: false,
        get: () => tracked.value,
        onChange: () => {
          changeCount += 1;
        },
      });

      expect(obs.value).toEqual(1);
      tracked.value = 2;
      expect(obs.value).toEqual(2);
      await delay();
      expect(changeCount).toEqual(1);
    });
  });

  describe('hooks', () => {
    describe('onGet', () => {
      it('calls onGet when value is accessed', () => {
        let getCalled = false;
        const obs = Observer({
          get: () => 'value',
          onGet: () => {
            getCalled = true;
          },
        });

        expect(getCalled).toBe(false);
        expect(obs.value).toEqual('value');
        expect(getCalled).toBe(true);
      });

      it('calls onGet on every access (cached)', () => {
        let getCount = 0;
        const obs = Observer({
          get: () => 'value',
          onGet: () => {
            getCount += 1;
          },
        });

        expect(obs.value).toEqual('value');
        expect(obs.value).toEqual('value');
        expect(obs.value).toEqual('value');
        expect(getCount).toEqual(3);
      });

      it('passes observer instance to onGet', () => {
        let receivedObs = null;
        const obs = Observer({
          get: () => 'value',
          onGet: (o) => {
            receivedObs = o;
          },
        });

        expect(obs.value).toEqual('value');
        expect(receivedObs).toBe(obs);
      });
    });

    describe('onImmediateChange', () => {
      it('calls onImmediateChange synchronously when dependency changes', () => {
        const tracked = Reactive({ value: 1 });
        let immediateCount = 0;
        let changeCount = 0;
        const obs = Observer({
          get: () => tracked.value,
          onImmediateChange: () => {
            immediateCount += 1;
          },
          onChange: () => {
            changeCount += 1;
          },
        });

        expect(obs.value).toEqual(1);
        expect(immediateCount).toEqual(0);
        expect(changeCount).toEqual(0);

        tracked.value = 2;

        // onImmediateChange is called synchronously
        expect(immediateCount).toEqual(1);
        // onChange is scheduled asynchronously
        expect(changeCount).toEqual(0);
      });

      it('provides access to prev value in onImmediateChange', () => {
        const tracked = Reactive({ value: 1 });
        let prevValue = null;
        const obs = Observer({
          get: () => tracked.value,
          onImmediateChange: (o) => {
            prevValue = o.prev;
          },
        });

        expect(obs.value).toEqual(1);
        tracked.value = 2;
        expect(prevValue).toEqual(1);
      });
    });
  });

  describe('writable computed', () => {
    it('allows setting value with custom setter', () => {
      const data = Reactive({ firstName: 'John', lastName: 'Doe' });
      const obs = Observer({
        get: () => `${data.firstName} ${data.lastName}`,
        set: (val: string) => {
          const [first, last] = val.split(' ');

          data.firstName = first;
          data.lastName = last;
        },
      });

      expect(obs.value).toEqual('John Doe');

      obs.value = 'Jane Smith';

      expect(obs.value).toEqual('Jane Smith');
      expect(data.firstName).toEqual('Jane');
      expect(data.lastName).toEqual('Smith');
    });

    it('throws when setting value without setter', () => {
      const obs = Observer({
        name: 'testComputed',
        get: () => 'value',
      });

      expect(() => {
        obs.value = 'new value';
      }).toThrow('No setter defined for "testComputed"');
    });

    it('calls onSet hook when value is set', () => {
      let setCalled = false;
      let receivedObs = null;
      const data = Reactive({ value: 1 });
      const obs = Observer({
        get: () => data.value,
        set: (val: number) => {
          data.value = val;
        },
        onSet: (o) => {
          setCalled = true;
          receivedObs = o;
        },
      });

      expect(setCalled).toBe(false);
      obs.value = 42;
      expect(setCalled).toBe(true);
      expect(receivedObs).toBe(obs);
    });

    it('updates cached value after set triggers dependency change', () => {
      const data = Reactive({ value: 1 });
      const obs = Observer({
        get: () => data.value * 2,
        set: (val: number) => {
          data.value = val / 2;
        },
      });

      expect(obs.value).toEqual(2);
      obs.value = 10;
      expect(obs.value).toEqual(10);
      expect(data.value).toEqual(5);
    });
  });

  describe('name property', () => {
    it('stores name for debugging', () => {
      const obs = Observer({
        name: 'myComputed',
        get: () => 'value',
      });

      expect(obs.name).toEqual('myComputed');
    });
  });

  describe('creating reactive objects during computation', () => {
    it('maintains dependency tracking when atoms with same key are modified during computation', () => {
      // This test verifies a bug fix where setting properties on reactive objects
      // created during a computed's execution would clear unrelated dependencies
      // that share the same tracking key.
      //
      // The bug occurred because:
      // 1. A computed runs and clears its dependencies
      // 2. It accesses an atom's 'value' property - registers dependency under key 'value'
      // 3. It creates new atoms and READS from them (registering more 'value' deps)
      // 4. It then WRITES to those atoms, triggering trackerChanged(atom, 'value')
      // 5. trackerChanged called observerClear(obs, 'value') which cleared ALL 'value' deps
      // 6. This cleared the dependency on the ORIGINAL atom
      //
      // This pattern mirrors how @reactive decorators work - each decorated property
      // uses an atom {value: T} internally, all sharing 'value' as the tracking key.

      // Create an "atom" - a reactive wrapper with a 'value' property
      // This is how @reactive properties work internally
      const sourceAtom = Reactive({ value: [1, 2, 3] });

      let computeCount = 0;

      const obs = Observer({
        get: () => {
          computeCount += 1;

          // Access the atom's value - registers dependency under key 'value'
          const items = sourceAtom.value;

          // Create new atoms during computation
          return items.map((item) => {
            const wrapperAtom = Reactive({ value: item });

            // READ from the atom first - this registers a dependency on wrapperAtom
            // under key 'value'. Now the observer depends on BOTH sourceAtom.value
            // AND wrapperAtom.value, both under the same key 'value'.
            const currentValue = wrapperAtom.value;

            // WRITE to the atom - this triggers trackerChanged(wrapperAtom, 'value')
            // which notifies all observers of wrapperAtom.value (including us).
            // The bug: observerClear(obs, 'value') was called unconditionally,
            // clearing ALL 'value' dependencies including sourceAtom.value!
            wrapperAtom.value = currentValue * 2;

            return wrapperAtom;
          });
        },
      });

      // First access
      const result1 = obs.value;

      expect(result1).toHaveLength(3);
      expect(result1[0].value).toEqual(2);
      expect(computeCount).toEqual(1);

      // Change the ORIGINAL atom's value
      // This should trigger recomputation because we depend on sourceAtom.value
      sourceAtom.value = [10, 20];

      // The computed MUST rerun - this is the critical assertion
      const result2 = obs.value;

      expect(result2).toHaveLength(2);
      expect(result2[0].value).toEqual(20);
      expect(computeCount).toEqual(2);
    });

    it('preserves dependencies when multiple atoms share the same key', () => {
      // Simulates the @reactive decorator pattern where multiple properties
      // all use atoms with 'value' as the key

      const atom1 = Reactive({ value: 'hello' });
      const atom2 = Reactive({ value: 'world' });

      let computeCount = 0;

      const obs = Observer({
        get: () => {
          computeCount += 1;

          // Depend on atom1.value
          const greeting = atom1.value;

          // Create a new atom during computation
          const tempAtom = Reactive({ value: greeting });

          // READ then WRITE - the read registers dependency, the write triggers change
          const current = tempAtom.value;

          tempAtom.value = current.toUpperCase(); // This SET was clearing atom1 dependency

          return `${tempAtom.value} ${atom2.value}`;
        },
      });

      expect(obs.value).toEqual('HELLO world');
      expect(computeCount).toEqual(1);

      // Changing atom1 should trigger recomputation
      atom1.value = 'goodbye';

      expect(obs.value).toEqual('GOODBYE world');
      expect(computeCount).toEqual(2);

      // Changing atom2 should also trigger recomputation
      atom2.value = 'everyone';

      expect(obs.value).toEqual('GOODBYE everyone');
      expect(computeCount).toEqual(3);
    });

    it('handles nested computations with atom creation correctly', () => {
      const sourceAtom = Reactive({ value: 5 });

      let innerComputeCount = 0;
      let outerComputeCount = 0;

      const innerObs = Observer({
        get: () => {
          innerComputeCount += 1;

          const val = sourceAtom.value;

          // Create atom during computation
          const temp = Reactive({ value: val });

          // READ then WRITE pattern that triggers the bug
          const current = temp.value;

          temp.value = current * 2;
          return temp.value;
        },
      });

      const outerObs = Observer({
        get: () => {
          outerComputeCount += 1;
          return innerObs.value + 1;
        },
      });

      expect(outerObs.value).toEqual(11); // (5 * 2) + 1
      expect(innerComputeCount).toEqual(1);
      expect(outerComputeCount).toEqual(1);

      // Change source - both should recompute
      sourceAtom.value = 10;

      expect(outerObs.value).toEqual(21); // (10 * 2) + 1
      expect(innerComputeCount).toEqual(2);
      expect(outerComputeCount).toEqual(2);
    });
  });
});
