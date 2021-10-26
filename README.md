# madrone (mah droh nuh)
🌳

Madrone is an easy way to make reactive objects in JS.

## Installation
```javascript
// npm
npm install madronejs --save

// yarn
yarn add madronejs
```

## Quick start

### Reactivity

```javascript
import Madrone, { MadroneState } from 'madronejs'

// add reactivity integration
// MadroneVue2, and MadroneVue3 are also available
Madrone.use(MadroneState);

const PersonFactory = ({ name } = {}) => Madrone.auto({
  name,
  // when using reactivity integration, getters become cached computeds
  // that only get recomputed when a reactive data property changes.
  // In this case, `name` is a reactive data property.
  get greeting() {
    return `Hi, I'm ${this.name}`
  },
});

const person = PersonFactory({ name: 'Greg' });
const newVals = [];
const oldVals = [];

// Watch a reactive property when it changes. Any reactive property accessed
// in the first argument will cause the watcher callback to trigger. Anything
// returned from the first argument will define what the newVal/oldVal is.
Madrone.watch(() => person.greeting, (newVal, oldVal) => {
  newVals.push(newVal);
  oldVals.push(oldVal);
});

person.name; // Greg
person.greeting; // Hi, I'm Greg

person.name = 'Not Greg';
person.greeting; // Hi, I'm Not Greg

// watcher is async...
console.log('New Vals:', newVals); // ["Hi, I'm Not Greg"]
console.log('Old Vals:', oldVals); // ["Hi, I'm  Greg"]
```

### Model Templates

```javascript
import Madrone from 'madronejs';

const Person = Madrone.Model.create({
  name: 'default name',
  age: -1,

  // initialization hook
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
