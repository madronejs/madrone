import Madrone, { computed, reactive } from '../../index';

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
    }

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
      await new Promise((resolve) => setTimeout(resolve));
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
      await new Promise((resolve) => setTimeout(resolve));
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
      await new Promise((resolve) => setTimeout(resolve));
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
      await new Promise((resolve) => setTimeout(resolve));
      expect(calls).toEqual(0);
    });
  });
}
