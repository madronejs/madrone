import Madrone from '../../Madrone';

describe('Created', () => {
  it('is called when node is created', () => {
    let counter = 0;
    const model = Madrone.Model.create({
      $options: {
        created() {
          counter += 1;
        },
      },
    });
    model.create();
    model.create();
    expect(counter).toEqual(2);
  });

  it('is called after $init', () => {
    let counter = 0;
    const model = Madrone.Model.create({
      $options: {
        created() {
          counter += 1;
          expect(this.val).toEqual(true)
        },
      },

      val: undefined,
      $init(data) {
        this.val = data.val;
      },
    });
    const instance = model.create({ val: true });

    expect(instance.val).toEqual(true);
    expect(counter).toEqual(1);
  });

  it('chains "created" hooks if they are extended', () => {
    let counter1 = 0;
    let counter2 = 0;
    const lifecycle = [];
    const model = Madrone.Model.create({
      $options: {
        created() {
          counter1 += 1;
          lifecycle.push('created1');
        },
      },
      $init() {
        lifecycle.push('$init');
      },
    }).extend({
      $options: {
        created() {
          counter2 += 1;
          lifecycle.push('created2');
        }
      }
    });

    model.create();

    expect(counter1).toEqual(1);
    expect(counter2).toEqual(1);
    expect(lifecycle).toEqual(['$init', 'created1', 'created2']);
  });
});
