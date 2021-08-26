import Computed from '../Computed';
import Watcher from '../Watcher';
import Reactive from '../Reactive';

describe('Watcher', () => {
  it('has callback when tracked value changed', async () => {
    const object = { test: null };
    const tracked = Reactive.create(object);
    const newValues = [];
    const oldValues = [];

    Watcher.create(
      () => tracked.test,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      }
    );

    tracked.test = false;
    await new Promise(setTimeout);
    tracked.test = true;
    await new Promise(setTimeout);
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  it('has callback when computed value changed', async () => {
    const object = { test: null };
    const tracked = Reactive.create(object);
    const newValues = [];
    const oldValues = [];
    const computed = Computed.create({
      get: () => tracked.test,
    });

    Watcher.create(
      () => computed.value,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      }
    );

    tracked.test = false;
    await new Promise(setTimeout);
    tracked.test = true;
    await new Promise(setTimeout);
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });

  it('can stop watching when disposer called', async () => {
    const object = { test: null };
    const tracked = Reactive.create(object);
    const newValues = [];
    const oldValues = [];
    const computed = Computed.create({
      get: () => tracked.test,
    });

    const dispose = Watcher.create(
      () => computed.value,
      (val, old) => {
        newValues.push(val);
        oldValues.push(old);
      }
    );

    tracked.test = false;
    await new Promise(setTimeout);
    dispose();
    tracked.test = true;
    await new Promise(setTimeout);
    expect(newValues).toEqual([false]);
    expect(oldValues).toEqual([null]);
  });

  it('can deep watch changes', async () => {
    const object = { test: { nested: true } };
    const tracked = Reactive.create(object);
    const newValues = [];
    const oldValues = [];

    Watcher.create(
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
    await new Promise(setTimeout);
    tracked.test = true;
    await new Promise(setTimeout);
    expect(newValues).toEqual([{ test: { nested: false } }, { test: true }]);
    expect(oldValues).toEqual([{ test: { nested: true } }, { test: { nested: false } }]);
  });
});