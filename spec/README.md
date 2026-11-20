# TLA+ specs

`Reactivity.tla` models the reactivity design: dirty propagation, cached computeds, per-run dependency tracking, strong and weak holding of observers, watchers (including ones whose disposer was dropped, ones that dispose themselves from their own getter, and ones whose first run throws), getters that throw (the error is cached like a value, and readers either catch it or let it through), and garbage collection, which may remove anything not reachable from a root through strong references.
`MCReactivity.tla` and `MCReactivity.cfg` give TLC a small graph to check exhaustively: every order of writes, reads, watcher creation and delivery, disposal, owner release and GC, with every mix of weak and strong computeds, and with an error reaching both a reader that catches it and one that doesn't.

## Running

```bash
pnpm spec:check                # every spec/MC*.tla
pnpm spec:check MCReactivity   # one
```

It needs Node and Java 11+ (any distribution, e.g. `apt install openjdk-21-jre-headless` or `brew install openjdk`).
The script does not install Java; it stops with instructions if it can't find one.
Set `TLA_JAVA=/path/to/java` to use a Java that isn't on the `PATH`.
The script downloads the pinned TLA+ tools jar, checks its SHA-256, and caches it in `node_modules/.cache/tlaplus`.
A run takes about 2 minutes.

## What is checked

| Invariant | Meaning |
| --- | --- |
| `NoStaleRead` | A clean computed's cache is what it would compute now. |
| `DepsExact` | A clean computed tracks exactly what a fresh run would read. |
| `NoDangling` | Nothing live references something that was collected. |
| `WatchersDelivered` | Once scheduled changes run, every watcher has seen its target's current value (unless it's an error the watcher lets through). |
| `FailedWatchersSilent` | A watcher whose creation threw never calls its handler. |
| `DisposedUnsubscribed` | A disposed watcher is subscribed to nothing, however it was disposed. |
| `InUseIsLive`, `InUseIsReachable` | Nothing owned, watched or queued was or can be collected. |
| `UnusedIsCollectible` | A weak computed nothing uses is not kept alive by its sources. |

Each property was checked to fail when the rule it guards is broken: dropping the strong-dependent rule (the weak computed regression) breaks `InUseIsReachable`, not propagating dirtiness breaks `WatchersDelivered`, keeping dependencies a run didn't read breaks `DepsExact`, not depending on a computed whose read threw breaks `DepsExact`, keeping the old cache when a getter throws breaks `NoStaleRead`, a disposed watcher keeping its getter breaks `UnusedIsCollectible`, a watcher whose first run threw staying subscribed breaks `FailedWatchersSilent`, and a watcher that disposed itself mid-run keeping what the rest of the run read breaks `DisposedUnsubscribed` (and `UnusedIsCollectible` without it).

The spec checks the design, not the TypeScript.
`src/reactivity/__spec__/model.spec.ts` runs random programs against the code and a reference model to check the code follows the same rules.
When changing the rules in `src/reactivity/global.ts` or `Observer.ts`, update the spec too.

## CI

The spec only needs checking when it or the rules it models change, so a job can be limited to those paths:

```yaml
on:
  pull_request:
    paths: ['spec/**', 'src/reactivity/global.ts', 'src/reactivity/Observer.ts', 'scripts/tla.mjs']

# in the job's steps, after installing Node and dependencies:
- uses: actions/setup-java@v4
  with:
    distribution: temurin
    java-version: '21'
- run: pnpm spec:check
```
