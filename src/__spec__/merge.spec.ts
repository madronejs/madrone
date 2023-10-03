import { describe, it, expect } from 'vitest';
import { merge } from '../util';

describe('merge', () => {
  it('merges regular properties', () => {
    const foo = { test: 123 };
    const bar = { name: 'bob' };
    const obj = merge(foo, bar);

    expect(obj.test).toBeDefined();
    expect(obj.name).toBeDefined();
    expect(obj.test).toEqual(foo.test);
    expect(obj.name).toEqual(bar.name);
    expect(Object.keys(obj).length).toEqual(2);
  });

  it('merges getters', () => {
    const foo = {
      val: 123,
      get test() {
        return this.val;
      },
    };
    const bar = {
      val1: 'bob',
      get name() {
        return this.val1;
      },
    };
    const obj = merge(foo, bar);

    expect(obj.test).toBeDefined();
    expect(obj.name).toBeDefined();
    expect(obj.test).toEqual(foo.test);
    expect(obj.name).toEqual(bar.name);
  });
});
