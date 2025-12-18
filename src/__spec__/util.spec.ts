/* eslint-disable max-classes-per-file */
import { describe, it, expect } from 'vitest';
import { applyClassMixins, getDefaultDescriptors } from '../util';

describe('applyClassMixins', () => {
  it('applies mixin methods to base class', () => {
    class Timestamped {
      getAge() {
        return 'age';
      }
    }

    class Base {
      id = 'base';
    }

    applyClassMixins(Base, [Timestamped]);

    const instance = new Base() as Base & Timestamped;

    expect(instance.id).toBe('base');
    expect(instance.getAge()).toBe('age');
  });

  it('applies multiple mixins', () => {
    class MixinA {
      methodA() {
        return 'A';
      }
    }

    class MixinB {
      methodB() {
        return 'B';
      }
    }

    class Base {
      baseMethod() {
        return 'base';
      }
    }

    applyClassMixins(Base, [MixinA, MixinB]);

    const instance = new Base() as Base & MixinA & MixinB;

    expect(instance.baseMethod()).toBe('base');
    expect(instance.methodA()).toBe('A');
    expect(instance.methodB()).toBe('B');
  });

  it('preserves base class methods over mixin methods', () => {
    class Mixin {
      shared() {
        return 'mixin';
      }
    }

    class Base {
      shared() {
        return 'base';
      }
    }

    applyClassMixins(Base, [Mixin]);

    const instance = new Base();

    expect(instance.shared()).toBe('base');
  });

  it('applies getters and setters from mixins', () => {
    class Mixin {
      private _value = 0;

      get computed() {
        return this._value * 2;
      }

      set computed(val: number) {
        this._value = val;
      }
    }

    class Base {
      name = 'base';
    }

    applyClassMixins(Base, [Mixin]);

    const instance = new Base() as Base & Mixin;

    instance.computed = 5;
    expect(instance.computed).toBe(10);
  });

  it('works with empty mixins array', () => {
    class Base {
      value = 42;
    }

    applyClassMixins(Base, []);

    const instance = new Base();

    expect(instance.value).toBe(42);
  });
});

describe('getDefaultDescriptors', () => {
  it('returns property descriptors with defaults', () => {
    const obj = {
      name: 'test',
      value: 42,
    };

    const descriptors = getDefaultDescriptors(obj);

    expect(descriptors.name.value).toBe('test');
    expect(descriptors.name.configurable).toBe(true);
    expect(descriptors.name.enumerable).toBe(false);

    expect(descriptors.value.value).toBe(42);
    expect(descriptors.value.configurable).toBe(true);
    expect(descriptors.value.enumerable).toBe(false);
  });

  it('applies custom defaults', () => {
    const obj = { prop: 'value' };

    const descriptors = getDefaultDescriptors(obj, {
      enumerable: true,
      writable: false,
    });

    expect(descriptors.prop.configurable).toBe(true);
    expect(descriptors.prop.enumerable).toBe(true);
    expect(descriptors.prop.writable).toBe(false);
  });

  it('handles getters and setters', () => {
    let internal = 0;
    const obj = {
      get computed() {
        return internal;
      },
      set computed(val: number) {
        internal = val;
      },
    };

    const descriptors = getDefaultDescriptors(obj);

    expect(typeof descriptors.computed.get).toBe('function');
    expect(typeof descriptors.computed.set).toBe('function');
    expect(descriptors.computed.configurable).toBe(true);
    expect(descriptors.computed.enumerable).toBe(false);
  });

  it('handles symbols as keys', () => {
    const sym = Symbol('test');
    const obj = { [sym]: 'symbol value' };

    const descriptors = getDefaultDescriptors(obj);

    expect(descriptors[sym].value).toBe('symbol value');
    expect(descriptors[sym].configurable).toBe(true);
  });

  it('handles empty objects', () => {
    const descriptors = getDefaultDescriptors({});

    expect(Object.keys(descriptors).length).toBe(0);
  });

  it('can define properties on new object using returned descriptors', () => {
    const source = {
      name: 'original',
      getValue() {
        return 100;
      },
    };

    const descriptors = getDefaultDescriptors(source, { enumerable: true });
    const target = {};

    Object.defineProperties(target, descriptors);

    expect((target as typeof source).name).toBe('original');
    expect((target as typeof source).getValue()).toBe(100);
  });
});
