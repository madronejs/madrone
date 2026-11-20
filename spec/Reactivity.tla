----------------------------- MODULE Reactivity -----------------------------
(***************************************************************************)
(* Madrone's reactivity design: sources, cached computeds and watchers,    *)
(* dirty propagation, per-run dependency tracking, strong/weak holding of  *)
(* observers, and garbage collection.                                      *)
(*                                                                         *)
(* JavaScript runs one task at a time, so each public operation (a write,  *)
(* a read, delivering a scheduled watcher change, a GC) is one atomic      *)
(* step. The checker explores every order of those steps.                  *)
(*                                                                         *)
(* Values are bits and a computed's value is the parity of what it reads,  *)
(* which keeps the state space finite while still letting a computed's     *)
(* dependencies change with the data (its condition picks a branch).       *)
(* A computed in Throws throws when its condition is 1. An error is cached *)
(* like a value (Err): reading it rethrows, and a reader in Catches counts *)
(* it as 0, otherwise it propagates and the reader stops reading there.    *)
(*                                                                         *)
(* Code this models:                                                       *)
(*   src/reactivity/global.ts   dependencies, holding, change propagation  *)
(*   src/reactivity/Observer.ts caching, runs, the dependency sweep        *)
(*   src/reactivity/Watcher.ts  watchers                                   *)
(* src/reactivity/__spec__/model.spec.ts tests the code against the same   *)
(* rules with random programs.                                             *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, Sequences, TLC

CONSTANTS
  Sources,    \* reactive properties (long-lived: they are GC roots)
  Computeds,  \* cached computeds
  Watchers,   \* watchers
  Cond,       \* Cond[c]: the node c reads first; its parity picks the branch
  Odd,        \* Odd[c]: the nodes c sums, in order, when Cond[c] is 1
  Even,       \* Even[c]: the nodes c sums, in order, when Cond[c] is 0
  Throws,     \* computeds whose getter throws when their condition is 1
  Catches,    \* computeds that catch errors from what they read (counting them as 0)
  Target      \* Target[w]: the node watcher w watches

Nodes == Sources \cup Computeds
Observers == Computeds \cup Watchers
NoValue == 2
Err == 3

Range(seq) == {seq[i] : i \in DOMAIN seq}

\* What an observer's getter closure references, whichever branch it takes
Captures(o) == IF o \in Computeds THEN {Cond[o]} \cup Range(Odd[o]) \cup Range(Even[o]) ELSE {Target[o]}

VARIABLES
  val,       \* source values
  weak,      \* computeds created with `weak: true` (an object's computed property)
  cache,     \* cached value of each computed
  dirty,     \* whether a computed must re-run before its cache can be used
  deps,      \* deps[o]: what o read in its latest run (OBSERVER_TO_PROXIES)
  owned,     \* computeds their owner (the object they are defined on) still references
  live,      \* observers not garbage collected
  created,   \* watchers that have been created
  kept,      \* watchers whose disposer is still referenced
  disposed,  \* watchers that were disposed
  pending,   \* watchers with a change scheduled (the task queue references them)
  seen       \* the value each watcher's handler last received

vars == <<val, weak, cache, dirty, deps, owned, live, created, kept, disposed, pending, seen>>

-----------------------------------------------------------------------------
(* Evaluation. With useCache = FALSE this is what everything should be,    *)
(* recomputed from scratch; with useCache = TRUE it is what the code       *)
(* computes, where a clean computed answers from its cache.                *)

\* What computed c makes of a value it read
In(c, v) == IF v = Err /\ c \in Catches THEN 0 ELSE v

RECURSIVE Eval(_, _), SumFrom(_, _, _, _, _)

Eval(n, useCache) ==
  IF n \in Sources THEN val[n]
  ELSE IF useCache /\ ~dirty[n] THEN cache[n]
  ELSE LET cv == In(n, Eval(Cond[n], useCache))
       IN IF cv = Err \/ (cv = 1 /\ n \in Throws) THEN Err
          ELSE SumFrom(n, IF cv = 1 THEN Odd[n] ELSE Even[n], 1, 0, useCache)

\* Sums seq[i..] into acc; the first error that isn't caught ends the run
SumFrom(c, seq, i, acc, useCache) ==
  IF i > Len(seq) THEN acc % 2
  ELSE LET v == In(c, Eval(seq[i], useCache))
       IN IF v = Err THEN Err ELSE SumFrom(c, seq, i + 1, acc + v, useCache)

\* What a run of c reads: its condition, then its branch up to an error it doesn't catch
RECURSIVE ReadFrom(_, _, _, _)
ReadFrom(c, seq, i, useCache) ==
  IF i > Len(seq) THEN {}
  ELSE {seq[i]} \cup (IF In(c, Eval(seq[i], useCache)) = Err THEN {} ELSE ReadFrom(c, seq, i + 1, useCache))

Reads(c, useCache) ==
  LET cv == In(c, Eval(Cond[c], useCache))
  IN {Cond[c]} \cup (IF cv = Err \/ (cv = 1 /\ c \in Throws) THEN {}
                    ELSE ReadFrom(c, IF cv = 1 THEN Odd[c] ELSE Even[c], 1, useCache))

Value(n) == Eval(n, FALSE)
ReadSet(c) == Reads(c, FALSE)
ImplValue(n) == Eval(n, TRUE)
ImplReadSet(c) == Reads(c, TRUE)

\* The computeds that run when n is read: n if dirty, and the dirty ones it reads
RECURSIVE RunSet(_)
RunSet(n) ==
  IF n \in Sources \/ ~dirty[n] THEN {}
  ELSE {n} \cup UNION {RunSet(m) : m \in ImplReadSet(n)}

(* Reading n runs RunSet(n). Each run keeps the dependencies it reads again *)
(* and drops the rest (observerSweep), so its deps become what it read.     *)
RunUpdates(n, extraDeps) ==
  LET R == RunSet(n) IN
  /\ cache' = [c \in Computeds |-> IF c \in R THEN ImplValue(c) ELSE cache[c]]
  /\ dirty' = [c \in Computeds |-> IF c \in R THEN FALSE ELSE dirty[c]]
  /\ deps' = [o \in Observers |->
                IF o \in DOMAIN extraDeps THEN extraDeps[o]
                ELSE IF o \in R THEN ImplReadSet(o)
                ELSE deps[o]]

-----------------------------------------------------------------------------
(* Change propagation (trackerChanged / setDirty).                         *)

\* The observers a node's observer set notifies; collected ones are skipped
Dependents(n) == {o \in live : n \in deps[o]}

(* setDirty marks a clean computed dirty and notifies its dependents; a     *)
(* computed that is already dirty stops there. Returns everything hit.      *)
RECURSIVE Hit(_, _)
Hit(frontier, acc) ==
  LET newC == {c \in frontier \cap Computeds : ~dirty[c]} \ acc
      newW == (frontier \cap Watchers) \ acc
  IN IF newC \cup newW = {} THEN acc
     ELSE Hit(UNION {Dependents(c) : c \in newC}, acc \cup newC \cup newW)

-----------------------------------------------------------------------------
(* Holding and garbage collection.                                         *)

(* A node's observer set holds a weak computed through its WeakRef, unless *)
(* a strongly held observer depends on it (STRONG_DEPENDENTS).             *)
RECURSIVE HeldStrongly(_)
HeldStrongly(o) ==
  \/ o \in Watchers
  \/ o \notin weak
  \/ \E d \in live : o \in deps[d] /\ HeldStrongly(d)

\* Strong references out of x: its observer sets, its tracked deps, its closure
Refs(x) ==
  {o \in live : x \in deps[o] /\ HeldStrongly(o)}
  \cup (IF x \in Observers THEN deps[x] \cup Captures(x) ELSE {})

Roots == Sources \cup owned \cup (kept \cap created) \cup pending

RECURSIVE Closure(_)
Closure(S) ==
  LET next == S \cup UNION {Refs(x) : x \in S}
  IN IF next = S THEN S ELSE Closure(next)

Reachable == Closure(Roots)

-----------------------------------------------------------------------------
(* Operations.                                                             *)

Init ==
  /\ val \in [Sources -> {0, 1}]
  /\ weak \in SUBSET Computeds
  /\ cache = [c \in Computeds |-> NoValue]
  /\ dirty = [c \in Computeds |-> TRUE]
  /\ deps = [o \in Observers |-> {}]
  /\ owned = Computeds
  /\ live = Computeds
  /\ created = {}
  /\ kept = {}
  /\ disposed = {}
  /\ pending = {}
  /\ seen = [w \in Watchers |-> NoValue]

\* Writing a different value notifies (optionSet); writing the same one doesn't
Write(s, v) ==
  /\ v # val[s]
  /\ val' = [val EXCEPT ![s] = v]
  /\ LET H == Hit(Dependents(s), {}) IN
       /\ dirty' = [c \in Computeds |-> dirty[c] \/ c \in H]
       /\ pending' = pending \cup ((H \cap Watchers) \ disposed)
  /\ UNCHANGED <<weak, cache, deps, owned, live, created, kept, disposed, seen>>

\* An owner reads its computed
Read(c) ==
  /\ c \in owned
  /\ RunUpdates(c, <<>>)
  /\ UNCHANGED <<val, weak, owned, live, created, kept, disposed, pending, seen>>

(* Creating a watcher runs it once (immediate). Its creator must be able to *)
(* reach the target, and may or may not keep the disposer.                  *)
CreateWatcher(w, isKept) ==
  /\ w \notin created
  /\ Target[w] \in Sources \cup owned
  /\ created' = created \cup {w}
  /\ live' = live \cup {w}
  /\ kept' = IF isKept THEN kept \cup {w} ELSE kept
  /\ seen' = [seen EXCEPT ![w] = ImplValue(Target[w])]
  /\ RunUpdates(Target[w], w :> {Target[w]})
  /\ UNCHANGED <<val, weak, owned, disposed, pending>>

\* The scheduled change runs: a disposed watcher does nothing (notifyChange)
Deliver(w) ==
  /\ w \in pending
  /\ pending' = pending \ {w}
  /\ IF w \in disposed
       THEN UNCHANGED <<cache, dirty, deps, seen>>
       ELSE /\ seen' = [seen EXCEPT ![w] = ImplValue(Target[w])]
            /\ RunUpdates(Target[w], w :> {Target[w]})
  /\ UNCHANGED <<val, weak, owned, live, created, kept, disposed>>

Dispose(w) ==
  /\ w \in kept \ disposed
  /\ disposed' = disposed \cup {w}
  /\ deps' = [deps EXCEPT ![w] = {}]
  /\ UNCHANGED <<val, weak, cache, dirty, owned, live, created, kept, pending, seen>>

\* The owner (the object a computed is defined on) is no longer referenced
Release(c) ==
  /\ c \in owned
  /\ owned' = owned \ {c}
  /\ UNCHANGED <<val, weak, cache, dirty, deps, live, created, kept, disposed, pending, seen>>

\* Anything not reachable through strong references may be collected
GC ==
  /\ live \cap Reachable # live
  /\ live' = live \cap Reachable
  /\ UNCHANGED <<val, weak, cache, dirty, deps, owned, created, kept, disposed, pending, seen>>

Next ==
  \/ \E s \in Sources, v \in {0, 1} : Write(s, v)
  \/ \E c \in Computeds : Read(c)
  \/ \E w \in Watchers, isKept \in BOOLEAN : CreateWatcher(w, isKept)
  \/ \E w \in Watchers : Deliver(w) \/ Dispose(w)
  \/ \E c \in Computeds : Release(c)
  \/ GC

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
(* Properties.                                                             *)

TypeOK ==
  /\ val \in [Sources -> {0, 1}]
  /\ weak \subseteq Computeds
  /\ cache \in [Computeds -> {0, 1, NoValue, Err}]
  /\ dirty \in [Computeds -> BOOLEAN]
  /\ deps \in [Observers -> SUBSET Nodes]
  /\ owned \subseteq live
  /\ live \subseteq Observers
  /\ kept \cup disposed \cup pending \subseteq created
  /\ seen \in [Watchers -> {0, 1, NoValue, Err}]

\* A clean computed's cache is what it would compute now
NoStaleRead == \A c \in live \cap Computeds : ~dirty[c] => cache[c] = Value(c)

\* A clean computed tracks exactly what a fresh run would read: nothing stale, nothing missing
DepsExact == \A c \in live \cap Computeds : ~dirty[c] => deps[c] = ReadSet(c)

\* Nothing live references something that was collected
NoDangling == \A o \in live : Captures(o) \cup deps[o] \subseteq Sources \cup live

\* Once queued changes are delivered, every watcher has seen its target's current value
WatchersDelivered ==
  pending = {} => \A w \in created \ disposed : seen[w] = Value(Target[w])

(* What should stay alive: what owners, watchers and the task queue use,   *)
(* subscribed computeds created strong (their sources keep them by        *)
(* design), and everything those read or capture.                          *)
\* A kept disposer keeps its watcher's getter (and what it captures), even once disposed
Users == owned \cup (created \ disposed) \cup (kept \cap created) \cup pending
         \cup {c \in Computeds \ weak : deps[c] # {}}

RECURSIVE Needed(_)
Needed(S) ==
  LET next == S \cup UNION {(deps[x] \cup Captures(x)) \cap Observers : x \in S \cap live}
  IN IF next = S THEN S ELSE Needed(next)

\* Nothing in use was collected (a watcher whose disposer was dropped included)
InUseIsLive == Needed(Users) \subseteq live

\* ...or can be: the next GC keeps it
InUseIsReachable == Needed(Users) \subseteq Reachable

\* A weak computed nothing uses can be collected: its sources don't keep it
UnusedIsCollectible == \A c \in (live \cap weak) \ Needed(Users) : c \notin Reachable

=============================================================================
