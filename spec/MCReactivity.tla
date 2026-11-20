---------------------------- MODULE MCReactivity ----------------------------
(***************************************************************************)
(* A small graph for TLC: two sources, a chain of computeds whose branches *)
(* switch with the data (c2 reads c1 both as its condition and in a        *)
(* branch, c3 reads c1 or c2), and a watcher on each of c2 and c3. Init    *)
(* tries every mix of weak and strong computeds and every start value.     *)
(***************************************************************************)
EXTENDS Reactivity

MCSources == {"s1", "s2"}
MCComputeds == {"c1", "c2", "c3"}
MCWatchers == {"w1", "w2"}

MCCond == ("c1" :> "s1") @@ ("c2" :> "c1") @@ ("c3" :> "s2")
MCOdd == ("c1" :> {"s2"}) @@ ("c2" :> {"s1"}) @@ ("c3" :> {"c2"})
MCEven == ("c1" :> {}) @@ ("c2" :> {"s2", "c1"}) @@ ("c3" :> {"c1"})
MCTarget == ("w1" :> "c2") @@ ("w2" :> "c3")
=============================================================================
