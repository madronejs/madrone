import Madrone, { MadroneState } from '../index';

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

  it('makes social greg', () => {
    const Person = Madrone.Model.create({
      name: 'default name',
      age: -1,

      $init({ name, age } = {}) {
        this.name = name;
        this.age = age;
      },
    });
    const SocialPerson = Person.extend({
      get greeting() {
        return `Hi there! My name is ${this.name}, and I'm ${this.age} years old.`;
      },

      greet() {
        console.log(this.greeting);
      },
    });
    const socialGreg = SocialPerson.create({ name: 'Greg', age: 35 });

    expect(socialGreg.greeting).toEqual("Hi there! My name is Greg, and I'm 35 years old.");
  });
});
