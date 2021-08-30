import Madrone from '../../index';
import Relationships from '../Relationships';

Madrone.use(Relationships);

describe('Relationships', () => {
  it('can make basic relationships', () => {
    const myModel = Madrone.Model.create({
      $options: {
        relationships: {
          bar: {
            default: [],
            joinOn: 'foo',
            resolve(join) {
              return join.map((id) => this.entries[id]);
            },
          },
        },
      },

      entries: {
        test1: true,
        test2: false,
      },
    });
    const instance = myModel.create();

    expect(instance.bar).toEqual([]);
    instance.foo.push('test1', 'test2');
    expect(instance.bar).toEqual([true, false]);
  });

  it('skips data merging if no data is on model', () => {
    const myModel = Madrone.Model.create({
      $options: {
        relationships: {
          bar: {
            default: [],
            joinOn: 'foo',
            resolve() {
              return 'testing';
            },
          },
        },
      },
    });
    const instance = myModel.create();

    expect(instance.bar).toEqual('testing');
  });
});
