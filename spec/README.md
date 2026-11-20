# TLA+ specs

`Reactivity.tla` models the reactivity design: dirty propagation, cached computeds, per-run dependency tracking, strong and weak holding of observers, watchers (including ones whose disposer was dropped), and garbage collection, which may remove anything not reachable from a root through strong references.
`MCReactivity.tla` and `MCReactivity.cfg` give TLC a small graph to check exhaustively: every order of writes, reads, watcher creation and delivery, disposal, owner release and GC, with every mix of weak and strong computeds.

## Running

```bash
pnpm spec:check                # every spec/MC*.tla
pnpm spec:check MCReactivity   # one
```

Only Node is needed.
The script downloads the pinned TLA+ tools jar and checks its SHA-256.
If no Java 11+ is on the `PATH`, it also downloads a pinned Temurin JRE the same way.
Both are cached in `node_modules/.cache/tlaplus`.
Set `TLA_JAVA=/path/to/java` to pick a Java, or `TLA_DOWNLOAD_JAVA=1` to always use the pinned one.
A run takes about 20 seconds.

## What is checked

| Invariant | Meaning |
| --- | --- |
| `NoStaleRead` | A clean computed's cache is what it would compute now. |
| `DepsExact` | A clean computed tracks exactly what a fresh run would read. |
| `NoDangling` | Nothing live references something that was collected. |
| `WatchersDelivered` | Once scheduled changes run, every watcher has seen its target's current value. |
| `InUseIsLive`, `InUseIsReachable` | Nothing owned, watched or queued was or can be collected. |
| `UnusedIsCollectible` | A weak computed nothing uses is not kept alive by its sources. |

Each property was checked to fail when the rule it guards is broken: dropping the strong-dependent rule (the weak computed regression) breaks `InUseIsReachable`, not propagating dirtiness breaks `WatchersDelivered`, and keeping dependencies a run didn't read breaks `DepsExact`.

The spec checks the design, not the TypeScript.
`src/reactivity/__spec__/model.spec.ts` runs random programs against the code and a reference model to check the code follows the same rules.
When changing the rules in `src/reactivity/global.ts` or `Observer.ts`, update the spec too.

## CI

```yaml
- uses: actions/setup-java@v4   # optional: the script downloads a JRE without it
  with:
    distribution: temurin
    java-version: '21'
- run: pnpm spec:check
```
