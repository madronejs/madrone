# madrone (mah droh nuh)
🌳

Madrone is an easy way to make object models and create instances of them.

## Installation
```javascript
// npm
npm install madrone --save

// yarn
yarn add madrone
```

## Quick start

```javascript
import Madrone from 'madrone';

const Person = Madrone.Model.create({
  name: 'default name',
  age: -1,

  $init({ name, age } = {}) {
    this.name = name;
    this.age = age;
  }
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

socialGreg.greet(); // Hi there! My name is Greg, and I'm 35 years old.
```
