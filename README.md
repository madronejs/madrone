# madrone (mah droh nuh)
🌳

Madrone is an easy way to make reactive objects in JS.

## Installation
```javascript
// npm
npm install madronejs --save

// pnpm
pnpm install madronejs

// yarn
yarn add madronejs
```

## Quick start

### Reactivity

```javascript
import Madrone, { MadroneState } from '@madronejs/core'

// add reactivity integration
// MadroneVue2, and MadroneVue3 are also available
Madrone.use(MadroneState);

const PersonFactory = ({ name } = {}) => Madrone.auto({
  // When using reactivity integration, getters become cached computeds
  // that only get recomputed when a reactive data property changes.
  // In this case, `name` is a reactive data property.
  name,
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

### Decorator support

```javascript

import Madrone, { MadroneState, computed, reactive } from '@madronejs/core'

Madrone.use(MadroneState);

class Person {
  @reactive name: string;
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
```
