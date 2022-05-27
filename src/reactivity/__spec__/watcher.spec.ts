import Computed from '../Computed';
import Watcher from '../Watcher';
import Reactive from '../Reactive';
import { delay } from '@/test/util';

describe('Watcher', () => {
  it('has callback when tracked value changed', async () => {
    const object = { test: null };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];

    Watcher(
      () => tracked.test,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      }
    );

    tracked.test = false;
    await delay();
    tracked.test = true;
    await delay();
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  it('has callback when computed value changed', async () => {
    const object = { test: null };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];
    const computed = Computed({
      get: () => tracked.test,
    });

    Watcher(
      () => computed.value,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      }
    );

    tracked.test = false;
    await delay();
    tracked.test = true;
    await delay();
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  it('can stop watching when disposer called', async () => {
    const object = { test: null };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];
    const computed = Computed({
      get: () => tracked.test,
    });

    const dispose = Watcher(
      () => computed.value,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      }
    );

    tracked.test = false;
    await delay();
    dispose();
    tracked.test = true;
    await delay();
    expect(newValues).toEqual([false]);
    expect(oldValues).toEqual([null]);
  });

  it('can deep watch changes', async () => {
    const object = { test: { nested: true } };
    const tracked = Reactive(object);
    const newValues = [];
    const oldValues = [];

    Watcher(
      () => tracked,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      },
      {
        deep: true,
      }
    );

    tracked.test.nested = false;
    await delay();
    tracked.test = true;
    await delay();
    expect(newValues).toEqual([{ test: { nested: false } }, { test: true }]);
    expect(oldValues).toEqual([{ test: { nested: true } }, { test: { nested: false } }]);
  });
});
