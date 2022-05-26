/* eslint-disable max-classes-per-file */
import Madrone, { computed, reactive, applyClassMixins } from '../../index';

export default function testClass(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe('reactive classes', () => {
    class Foo {
      @reactive name: string;
      @reactive age;
      @reactive unsetVal;
      notReactive;

      _test;

      static create(data?) {
        return new Foo(data);
      }

      constructor(options) {
        this.name = options?.name;
        this.age = options?.age;
      }

      @computed get summary() {
        this._test?.();
        return `${this.name} ${this.age}`;
      }

      @reactive _getterSetter: any;
      @computed get getterSetter() {
        return this._getterSetter;
      }

      set getterSetter(val) {
        this._getterSetter = val;
      }
    }

    it('throws error if setting a computed that has no setter defined', () => {
      const fooInstance = Foo.create();
      const failMessage = 'Cannot set the value of a read-only property!';

      try {
        // @ts-ignore
        fooInstance.summary = 'foo!';
        throw new Error(failMessage);
      } catch (e) {
        expect(e.message).not.toEqual(failMessage);
      }
    });

    it('makes accessed properties enumerable', () => {
      const fooInstance = Foo.create({ name: 'foo' });

      expect(Object.keys(fooInstance)).toEqual(['name', 'age']);
    });

    it('caches computed', () => {
      const fooInstance = Foo.create({ name: 'test', age: 10 });
      let calls = 0;

      fooInstance._test = () => {
        calls += 1;
      };

      expect(calls).toEqual(0);
      expect(fooInstance.summary).toEqual('test 10');
      expect(fooInstance.summary).toEqual('test 10');
      expect(calls).toEqual(1);
      fooInstance.name = 'test2';
      expect(fooInstance.summary).toEqual('test2 10');
      expect(fooInstance.summary).toEqual('test2 10');
      expect(calls).toEqual(2);
    });

    it('can get/set computed', () => {
      const fooInstance = Foo.create();

      expect(fooInstance.getterSetter).toEqual(undefined);
      fooInstance.getterSetter = 'test!';
      expect(fooInstance.getterSetter).toEqual('test!');
    });

    it('accessed computed is enumerable', () => {
      const fooInstance = Foo.create();

      fooInstance.getterSetter = 'test!';

      expect(Object.keys(fooInstance)).toEqual(['name', 'age', 'getterSetter', '_getterSetter']);
    });

    it('watches data', async () => {
      const fooInstance = Foo.create({ name: 'test', age: 10 });
      let calls = 0;

      Madrone.watch(
        () => fooInstance.summary,
        () => {
          calls += 1;
        }
      );

      expect(calls).toEqual(0);
      expect(fooInstance.summary).toEqual('test 10');
      fooInstance.name = 'test2';
      expect(fooInstance.summary).toEqual('test2 10');
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(calls).toEqual(1);
    });

    it('makes properties reactive if not set explicitly', async () => {
      const fooInstance = Foo.create();
      let calls = 0;

      Madrone.watch(
        () => fooInstance.unsetVal,
        () => {
          calls += 1;
        }
      );

      expect(calls).toEqual(0);
      fooInstance.unsetVal = true;
      expect(fooInstance.unsetVal).toEqual(true);
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(calls).toEqual(1);
    });

    it('does not trigger watcher when anther instance is mutated', async () => {
      const fooInstance = Foo.create();
      const fooInstance2 = Foo.create();
      let calls = 0;

      Madrone.watch(
        () => fooInstance.unsetVal,
        () => {
          calls += 1;
        }
      );

      expect(calls).toEqual(0);
      fooInstance2.unsetVal = true;
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(calls).toEqual(0);
    });

    it('does not trigger watcher on non-reactive properties', async () => {
      const fooInstance = Foo.create();
      let calls = 0;

      Madrone.watch(
        () => fooInstance.notReactive,
        () => {
          calls += 1;
        }
      );

      expect(calls).toEqual(0);
      fooInstance.notReactive = true;
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(calls).toEqual(0);
    });
  });
}

describe('class mixins', () => {
  it('handles reactive properties with the same name', () => {
    class FooMixin {
      @reactive name: string;
    }

    class BarMixin {
      @reactive name: string;
    }

    interface FooBar extends FooMixin, BarMixin {}

    class FooBar {
      @reactive age: number;
    }

    applyClassMixins(FooBar, [FooMixin, BarMixin]);

    const instance = new FooBar();

    instance.name = 'test';
    expect(instance.name).toEqual('test');
    instance.name = 'test2';
    expect(instance.name).toEqual('test2');
  });

  it('can have watched reactive properties from mixins', async () => {
    class NamedMixin {
      @reactive fName: string;
      @reactive lName: string;
      @computed get fullName() {
        return `${this.fName} ${this.lName}`;
      }
    }

    interface Person extends NamedMixin {}

    class Person {
      @reactive age: number;
    }

    applyClassMixins(Person, [NamedMixin]);

    const instance = new Person();
    const changes = [];

    Madrone.watch(
      () => instance.fullName,
      (val) => {
        changes.push(val);
      }
    );

    expect(instance.fullName).toEqual('undefined undefined');
    instance.fName = 'first';
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
    instance.lName = 'last';
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
    expect(instance.fullName).toEqual('first last');
    expect(changes).toEqual(['first undefined', 'first last']);
  });

  it('prefers getters/setters on the base class', () => {
    class FooMixin {
      @reactive _name: string;
      @computed get name(): string {
        return this._name;
      }

      set name(val) {
        this._name = `${val}_Foo`;
      }
    }

    class BarMixin {
      @reactive _name: string;
      @computed get name(): string {
        return this._name;
      }

      set name(val) {
        this._name = `${val}_Bar`;
      }
    }

    interface FooBar extends FooMixin, BarMixin {}

    class FooBar {
      @reactive _name: string;
      @computed get name(): string {
        return this._name;
      }

      set name(val) {
        this._name = `${val}_FooBar`;
      }
    }

    applyClassMixins(FooBar, [FooMixin, BarMixin]);

    const instance = new FooBar();

    instance.name = 'test';
    expect(instance.name).toEqual('test_FooBar');
    instance.name = 'test2';
    expect(instance.name).toEqual('test2_FooBar');
  });

  it('prefers methods on the base class', () => {
    class FooMixin {
      getType() {
        return 'foo';
      }
    }

    class BarMixin {
      getType() {
        return 'bar';
      }
    }

    interface FooBar extends FooMixin, BarMixin {}

    class FooBar {
      getType() {
        return 'foobar';
      }
    }

    applyClassMixins(FooBar, [FooMixin, BarMixin]);

    const instance = new FooBar();

    expect(instance.getType()).toEqual('foobar');
  });

  it('prefers the last item in the mixin array if no conflict with base', () => {
    class FooMixin {
      getType() {
        return 'foo';
      }

      getFoo() {
        return 'foo';
      }
    }

    class BarMixin {
      getType() {
        return 'bar';
      }

      getBar() {
        return 'bar';
      }
    }

    interface FooBar extends FooMixin, BarMixin {}

    class FooBar {
      getFooBar() {
        return 'foobar';
      }
    }

    applyClassMixins(FooBar, [FooMixin, BarMixin]);

    const instance = new FooBar();

    expect(instance.getType()).toEqual('bar');
    expect(instance.getFoo()).toEqual('foo');
    expect(instance.getBar()).toEqual('bar');
    expect(instance.getFooBar()).toEqual('foobar');
  });
});
