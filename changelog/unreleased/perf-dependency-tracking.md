---
type: Changed
text: "**Reactivity**: Reading reactive properties and computeds, and re-running computeds and watchers, is faster: dependencies are kept across runs and only the ones a run didn't read again are dropped, cached computed reads skip dependency bookkeeping, and the proxy get trap does fewer lookups."
---
