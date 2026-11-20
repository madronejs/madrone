import { describe, expect, it } from 'vitest';

import { isReactive } from '../global';
import Reactive from '../Reactive';

describe('proxy handlers', () => {
  it.each(['object', 'array', 'set', 'map'])('shares one %s handler across proxies with the same options', (type) => {
    const options = { name: 'shared' };

    expect(Reactive.typeHandler(type, options)).toBe(Reactive.typeHandler(type, options));
  });

  it('shares one handler across proxies made without options', () => {
    expect(Reactive.typeHandler('object', undefined)).toBe(Reactive.typeHandler('object', undefined));
  });

  it('gives different options their own handler', () => {
    expect(Reactive.typeHandler('object', { name: 'a' })).not.toBe(Reactive.typeHandler('object', { name: 'b' }));
  });

  it('makes nested objects reactive when no options are given', () => {
    const state = Reactive({ nested: { value: 1 } });

    expect(isReactive(state.nested)).toBe(true);
  });
});
