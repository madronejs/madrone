import Madrone from '../index';

describe('examples', () => {
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
