import Madrone from '../../index';

export default function testProxy(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe('auto classes', () => {
    class Foo {
      name;
      age;
      unsetVal;

      static create(data) {
        return new Foo(data);
      }

      constructor(options) {
        this.name = options?.name;
        this.age = options?.age;

        return Madrone.auto(this);
      }

      get summary() {
        this._test?.();
        return `${this.name} ${this.age}`;
      }
    }

    it('caches computed', () => {
      const fooInstance = Foo.create({ name: 'test', age: 10 });
      let calls = 0;

      fooInstance._test = () => {
        calls += 1;
      };

      expect(calls).toEqual(0);
      expect(fooInstance.summary).toEqual('test 10');
      expect(calls).toEqual(1);
      fooInstance.name = 'test2';
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
      await new Promise(setTimeout);
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
      await new Promise(setTimeout);
      expect(calls).toEqual(1);
    });
  });
}
