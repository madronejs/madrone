---
type: Fixed
text: "**Reactivity**: A computed whose getter throws now rethrows that error on later reads until one of its dependencies changes, instead of returning `undefined`. Computeds and watchers that read it while it was throwing (catching the error or not) now update once it recovers; previously they never heard about the recovery and kept a stale value."
---
