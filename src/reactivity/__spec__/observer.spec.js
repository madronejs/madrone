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
    await new Promise(setTimeout);
    tracked.test = true;
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(3);
    await new Promise(setTimeout);
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
    await new Promise(setTimeout);
    tracked.test = 'foo';
    tracked.test = 'bar';
    tracked.test = true;
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(3);
    await new Promise(setTimeout);
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
    await new Promise(setTimeout);
    tracked.test = true;
    expect(obs2.value).toEqual(true);
    expect(obs2.value).toEqual(true);
    expect(counter).toEqual(3);
    await new Promise(setTimeout);
    expect(newValues).toEqual([false, true]);
    expect(oldValues).toEqual([null, false]);
  });
});
