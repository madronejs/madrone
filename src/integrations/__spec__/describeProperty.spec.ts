import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

import Reactive from '@/reactivity/Reactive';

import { describeProperty } from '../MadroneState';

const optionsPassedToReactive = () => vi.mocked(Reactive.typeHandler).mock.calls.map(([, options]) => options);

describe('describeProperty', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives every instance of a property the same reactive options, so they share a proxy handler', () => {
    const integration = { reactive: {} };

    vi.spyOn(Reactive, 'typeHandler');
    describeProperty('count', { value: 1 }, integration);
    describeProperty('count', { value: 2 }, integration);

    const [first, second] = optionsPassedToReactive();

    expect(first).toBe(second);
  });

  it('keeps separate options for properties with different names or depth', () => {
    const integration = { reactive: {} };

    vi.spyOn(Reactive, 'typeHandler');
    describeProperty('count', { value: 1 }, integration);
    describeProperty('total', { value: 1 }, integration);
    describeProperty('count', { value: 1, deep: false }, integration);

    const [count, total, shallowCount] = optionsPassedToReactive();

    expect(count).not.toBe(total);
    expect(count).not.toBe(shallowCount);
    expect(shallowCount).toMatchObject({ deep: false, name: 'count' });
  });
});
