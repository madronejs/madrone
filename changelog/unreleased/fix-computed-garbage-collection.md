---
type: Fixed
text: "**Reactivity**: Objects with `@computed` or `auto()` computed properties can now be garbage collected once they are no longer referenced, even if their computeds read reactive state that lives longer. Previously the long-lived state kept every such object reachable, leaking memory."
---
