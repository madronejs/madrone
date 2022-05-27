/* eslint-disable max-classes-per-file */
import Madrone, { computed, reactive } from '../../index';

export default function testClass(integrationName, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  it('makes person factory', async () => {
    const PersonFactory = ({ name = undefined } = {}) =>
      Madrone.auto({
        name,
        // when using reactivity integration, getters become cached computeds
        get greeting() {
          return `Hi, I'm ${this.name}`;
        },
      });

    const person = PersonFactory({ name: 'Greg' });

    expect(Madrone.lastAccessed(person)).toBeUndefined();
    expect(person.name).toEqual('Greg');

    expect(typeof Madrone.lastAccessed(person)).toEqual('number');
  });

  it('makes person class', async () => {
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

    expect(Madrone.lastAccessed(person)).toBeUndefined();
    expect(person.name).toEqual('Greg');
    expect(typeof Madrone.lastAccessed(person)).toEqual('number');
  });
}
