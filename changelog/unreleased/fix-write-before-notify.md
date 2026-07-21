---
type: Fixed
text: "**Reactivity**: Object/array proxy `set` and `deleteProperty` traps now apply the mutation *before* notifying observers, matching the Map/Set handlers and Vue's own ordering. Previously, observers that ran synchronously on notification (e.g. Vue `flush: 'sync'` watchers via the `MadroneVue3` integration) read the pre-write value and could settle permanently stale, missing single in-place writes until an unrelated change re-dirtied them. Failed writes (frozen targets, non-writable properties) no longer emit notifications."
---
