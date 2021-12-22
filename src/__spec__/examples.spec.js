import Madrone, { MadroneState, computed, reactive } from '../index';

describe('examples', () => {
  beforeEach(() => {
    Madrone.use(MadroneState);
  });

  afterEach(() => {
    Madrone.unuse(MadroneState);
  });

  it('makes person factory', async () => {
    const PersonFactory = ({ name } = {}) =>
      Madrone.auto({
        name,
        // when using reactivity integration, getters become cached computeds
        get greeting() {
          return `Hi, I'm ${this.name}`;
        },
      });

    const person = PersonFactory({ name: 'Greg' });
    const newVals = [];
    const oldVals = [];

    const disposer = Madrone.watch(
      () => person.greeting,
      (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      }
    );

    expect(person.name).toEqual('Greg');
    expect(person.greeting).toEqual("Hi, I'm Greg");

    person.name = 'Not Greg';
    expect(person.greeting).toEqual("Hi, I'm Not Greg");

    await new Promise(setTimeout);
    expect(newVals).toEqual(["Hi, I'm Not Greg"]);
    expect(oldVals).toEqual(["Hi, I'm Greg"]);
    disposer();
  });

  it('makes person class', () => {
    class Person {
      @reactive name;
      @reactive age;

      @computed get greeting() {
        return `Hi, I'm ${this.name}`;
      }

      constructor(options) {
        this.name = options?.name;
        this.age = options?.age;
      }
    }

    const person = new Person({ name: 'Greg' });

    person.name; // Greg
    person.greeting; // Hi, I'm Greg

    person.name = 'Not Greg';
    person.greeting; // Hi, I'm Not Greg
  });
});
