---
type: Fixed
text: "**`watch()`**: When the watched getter throws on its first run, the watcher is now disposed before the error propagates. Previously the caller got no disposer, but the watcher stayed subscribed and its handler fired once the getter stopped throwing."
---
