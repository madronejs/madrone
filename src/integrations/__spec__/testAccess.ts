/* eslint-disable max-classes-per-file */
import Madrone, { computed, reactive } from '../../index';

const PersonFactory = ({ name = undefined } = {}) =>
  Madrone.auto({
    name,
    // when using reactivity integration, getters become cached computeds
    get greeting() {
      return 'test';
    },
  });

const PersonFactoryLevel2 = ({ name = undefined } = {}) => {
  const personInner = Madrone.auto({
    foo: true,
    get test() {
      return 'test';
    },
  });
  const person = Madrone.auto({
    personInner,
    name,
    // when using reactivity integration, getters become cached computeds
    get greeting() {
      return 'test';
    },
  });

  return { person, personInner };
};

export default function testClass(integrationName, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe('auto', () => {
    describe('one level deep', () => {
      test('reactive property', async () => {
        const person = PersonFactory({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(person.name).toEqual('Greg');
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
      });

      test('computed property', async () => {
        const person = PersonFactory({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(person.greeting).toEqual('test');
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
      });
    });

    describe('two levels deep', () => {
      test('reactive property', async () => {
        const { person, personInner } = PersonFactoryLevel2({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(Madrone.lastAccessed(personInner)).toBeUndefined();

        expect(person.name).toEqual('Greg');
        expect(person.personInner.foo).toBeTruthy();
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
        expect(typeof Madrone.lastAccessed(person.personInner)).toEqual('number');
        expect(typeof Madrone.lastAccessed(personInner)).toEqual('number');
      });

      test('computed property', async () => {
        const { person, personInner } = PersonFactoryLevel2({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(person.greeting).toEqual('test');
        expect(person.personInner.test).toBeTruthy();
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
        expect(typeof Madrone.lastAccessed(person.personInner)).toEqual('number');
        expect(typeof Madrone.lastAccessed(personInner)).toEqual('number');
      });
    });
  });

  describe('class', () => {
    describe('one level deep', () => {
      class Person {
        @reactive name;
        @computed get greeting() {
          return 'test';
        }

        constructor(options) {
          this.name = options?.name;
        }
      }

      test('reactive property', async () => {
        const person = new Person({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(person.name).toEqual('Greg');
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
      });

      test('computed property', async () => {
        const person = new Person({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(person.greeting).toEqual('test');
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
      });
    });

    describe('two levels deep', () => {
      class PersonInner {
        @reactive foo: boolean;
        @computed get test() {
          return 'test';
        }

        constructor() {
          this.foo = true;
        }
      }

      class Person {
        @reactive name;
        @reactive personInner: PersonInner;
        @computed get greeting() {
          return 'test';
        }

        constructor(options) {
          this.name = options?.name;
          this.personInner = new PersonInner();
        }
      }

      function PersonFactory3(options) {
        const person = new Person(options);
        const personInner = new PersonInner();

        person.personInner = personInner;

        return { person, personInner };
      }

      test('reactive property', async () => {
        const { person, personInner } = PersonFactory3({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(Madrone.lastAccessed(personInner)).toBeUndefined();

        expect(person.name).toEqual('Greg');
        expect(person.personInner.foo).toBeTruthy();
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
        expect(typeof Madrone.lastAccessed(person.personInner)).toEqual('number');
        expect(typeof Madrone.lastAccessed(personInner)).toEqual('number');
      });

      test('computed property', async () => {
        const { person, personInner } = PersonFactory3({ name: 'Greg' });

        expect(Madrone.lastAccessed(person)).toBeUndefined();
        expect(person.greeting).toEqual('test');
        expect(person.personInner.test).toBeTruthy();
        expect(typeof Madrone.lastAccessed(person)).toEqual('number');
        expect(typeof Madrone.lastAccessed(person.personInner)).toEqual('number');
        expect(typeof Madrone.lastAccessed(personInner)).toEqual('number');
      });

      test('computed that depends on reactive array that starts out with zero length', async () => {
        class Course {
          instructor: string;
          @reactive attendees: string[] = [];
          constructor(instructor: string) {
            this.instructor = instructor;
          }

          @computed get everyone() {
            return [this.instructor, ...this.attendees];
          }
        }

        const course = new Course('Olivia');

        expect(course.everyone).toEqual(['Olivia']);

        course.attendees.push('Carl');

        expect(course.everyone).toEqual(['Olivia', 'Carl']);
      });
    });
  });
}
