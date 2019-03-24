MimbleWimble and Liquid
====

## Cryptography overview

0.  Disclaimer: I am not a professional cryptologist!

1.  Abstract primitives

    _Trapdoor functions_
    _Public key crypto_

2.  A taste of algebra

    _Groups_
    _Examples_

3.  Security framework

    _Probability vs. info theory_

    > Security can mean different things.  Perfect security means that some threat is provably impossible.  However, for many systems it is impossible, intractable, or undesirable to rule out threats on logical grounds.  Instead we can argue that a threat actor with _bounded_ resources cannot compromise the system without luck.

    _Canonical hard problems_

    > There are a few problems that are considered to be unsolvable on classical (and sometimes quantum) computers at certain sizes.
    >  * discrete logarithm
    >  * prime factorization

    _Random oracles_

    > Suppose that you have two finite sets `X` and `Y`.  Then the set of functions `X -> Y` is also a set and a _random function_ is a function sampled uniformly at random from this set.  Random functions play a very important role in cryptography, but are incalulable for the kinds of sets `X` and `Y` that we care about.  The _random oracle_ hypothesis is the assumption that your system can compute values of one or more random functions in one instruction.

4.  Security of Schnorr

    Say that `(A, G)` is a group for which the discrete log problem is hard.  If you randomly pick a number `x` and keep it secret, then you will be the only one who knows that `P := x G` satisfies its defining equation.  This can be used to convince somebody that you know `x` without revealing it.

    > Interactive identification
    > * Challenge: `Bob: c -> Alice`
    > * Response: `Alice: sample r; (s := c * x + r, R := r * G) -> Bob`
    > * Verification: `Bob: s * G == c * P + R`

    The probability that Mallory can pass this protocol without knowing `x` is bounded in terms of the probability that Mallory can break discrete log.   Indeed, suppose there is an probabilistic algorithm `BREAK` such that `BREAK P c` outputs `(s, r)` and that `(s, r * G)` passes the protocol with probability `p`.  Then define

    ```
    c <- sample_nonzero
    (s, r) <- BREAK P c
    DLOG P c = (s - r) / c
    ```

    `DLOG` solves discrete log as often as `BREAK` fools Bob.

5.  Commitment schemes

    _Components_

    > A pair of algorithms `commit` and `open`

    _Binding:_  It should not be possible to lie about the value to which you committed

    > Given `x` and `r` no algorithm can find `x' != x` and `r'` such that `commit x r == commit x' r'` with non-negligible probability

    _Hiding:_  It should not be possible to compute the commited value better than random guessing


## Confidential transactions

1.  Pedersen commitments

    Setup: two NUMS points `G` and `H` where the value `x` such that `H = x G`
    is unknown.

    Committing uses randomness
    ```
    Commit:
      r <- sample
      commit x r := x * G + r * H

    Open:
      open x r c := c == x * G + r * H
    ```

    Homomorphic property:
    ```
    commit x0 r0 + commit x1 r1 = commit (x0+x1) (r0 + r1)
    ```

2.  The construction



## Confidential assets


## MimbleWimble transactions

1.  Interactive protocol
2.  Address layers

## MimbleWimble: blocks & transaction merging

1.  Signature consolidation
2.  Block structure

## Liquid network

1.  Design goals

    * 1-to-1 peg with BTC
    * Improved privacy
    * Support for several assets

2.  Security model
