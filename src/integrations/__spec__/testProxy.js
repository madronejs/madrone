import Madrone from '../../index';

export default function testProxy(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe('basic proxy usage', () => {
    it('returns original context when nothing returned from proxy', () => {
      const model = Madrone.Model.create({
        test: 'foo',
        $init() {
          return null;
        },
      });
      const instance = model.create();

      expect(instance).toBeTruthy();
      expect(instance.test).toEqual('foo');
    });

    it('can return a proxied version of the node', () => {
      const model = Madrone.Model.create({
        test: 'foo',
        $init() {
          return new Proxy(this, {
            get(target, prop) {
              if (prop === 'test') {
                return `proxy+${target[prop]}`;
              }

              return target[prop];
            },
            set(target, prop, value) {
              target[prop] = value;
            },
          });
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('proxy+foo');
    });
  });
}
