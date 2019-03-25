---
title: MimbleWimble and Liquid
date: March 25, 2019
---

# Some basics

Disclaimer: I am not a professional cryptologist!

---

## Primitives

Most cryptographic constructions are algebraic in nature.  Let's dive right in!

Def (_Abelian group_): A set `A` with a special element `0` and an operation `+` satisfying

1. for all `a`: `a + 0 = a`
2. for all `a` there is some `b` where `a + b = 0`
3. for any `a, b, c`: `a + (b + c) = (a + b) + c`
4. for all `a, b`: `a + b = b + a`

---

The main examples in cryptography are

* `Z_n = {0, ... , n-1}` where if `i + j >= n` we take the remainder after division by `n`
* Elliptic curve groups (...)

The main property that makes the constructions below work is hardness of the _discrete log problem_:  given some `a` in `A` there is a function `f n = n * a = a + (n times total) + a` which is easy to compute for a value of `n` but intractable to invert.

---

## Probability vs. info theory

Security can mean different things.  Perfect security means that some threat is provably impossible.  However, for many systems it is impossible, intractable, or undesirable to rule out threats on logical grounds.  Instead we can argue that a threat actor with _bounded_ resources cannot compromise the system without luck.

---

## Important hard problems

There are a few problems that are considered to be unsolvable on classical (and sometimes quantum) computers at certain sizes.

* discrete logarithm
* prime factorization
* hash inversion

These are targets for reduction proofs

---

## Random oracles

* Suppose that you have two finite sets `X` and `Y`.  Then the set of functions `X -> Y` is also a set and a _random function_ is a function sampled uniformly at random from this set.
* Random functions play a very important role in cryptography, but are incalulable for the kinds of sets `X` and `Y` that we care about.
* The _random oracle_ hypothesis is the assumption that your system can compute values of one or more random functions in one instruction.

---

## Schnorr protocol

Say that `(A, G)` is a group for which the discrete log problem is hard.  If you randomly pick a number `x` and keep it secret, then you will be the only one who knows that `P := x G` satisfies its defining equation.  This can be used to convince somebody that you know `x` without revealing it.

---

## Interactive identification

* Challenge: `Bob: c -> Alice`

* Response:

  `Alice: sample r; (s := c * x + r, R := r * G) -> Bob`

* Verification: `Bob: s * G == c * P + R`

---

## Schnorr protocol

The probability that Mallory can pass this protocol without knowing `x` is bounded in terms of the probability that Mallory can break discrete log.

---

## Reduction

Suppose there is an probabilistic algorithm `BREAK` such that `BREAK P c` outputs `(s, r)` and that `(s, r * G)` passes the protocol with probability `p`.  Then define

```
c <- sample_nonzero
(s, r) <- BREAK P c
DLOG P c = (s - r) / c
```

`DLOG` solves discrete log as often as `BREAK` fools Bob.

---

## Fiat-Shamir heuristic

Idea: replace the challenge value with the value of a random function.

---

Say `h` is a random scalar-valued function on group elements.  Then Alice can form

`s := h(R) * x + r, R := r * G`

to prove her knowledge of `x` without first getting a challenge value.

---

This becomes a digital signature if we assume that `h` is a random group-valued function on strings:

`s := h(string(R) + message) * x + r`.

---

# Commitment schemes

---

## Components

* `commit` -- create a commitment to a value
* `open` -- reveal that the commitment was to a particular value

---

## Binding:

* It should not be possible to lie about the value to which you committed
* Given `x` and `r` no algorithm can find `x' != x` and `r'` such that `commit x r == commit x' r'` with non-negligible probability

---

## Hiding:

* It should not be possible to compute the committed value better than random guessing
* Given `commit x r`, no algorithm can find `x` with non-negligible probability

---

## Pedersen commitments

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
(commit x0 r0) + (commit x1 r1) = commit (x0+x1) (r0 + r1)
```

---

# Confidential transactions

In this setting, all outputs have a blinding factor `r` in addition to an amount `a`.  The blinding factor is private information of the output owner.

---

## Transaction contents

```
* Inputs: `(a_1, r_1), (a_2, r_2)`
* Input signatures
* Outputs: `(b_1, s_1), (b_2, s_2), (b_3, s_3)`
* Output keys / scripts and range proofs
* Fee: f
```

_NB_ inputs and outputs only appear as commitments

The transaction is balanced exactly when

`a_1 + a_2 + f = b_1 + b_2 + b_3`.

---

Also

```
r_1 + r_2 = s_1 + s_2 + s_3 =>

(commit b_1 s_1) + (commit b_2 s_2) + (commit b_3 s_3)
  - (commit a_1 r_1) - (commit a_2 r_2)

= commit (b_1 + b_2 + b_3 - a_1 - a_2)
              (s_1 + s_2 + s_3 - r_1 - r_2)

= f * G
```

By using hiding commitments and range proofs, the value described by a transaction is obscured.

---

# MimbleWimble

---

One big insight of MimbleWimble is that confidential transactions that fail to balance provide an ownership mechanism via knowledge of the random values in the commitments.

---

## MimbleWimble transactions

MimbleWimble transactions are constructed interactively

---

1. Payer collects unspent outputs `(a_1, r_1), ... (a_n, r_n)` (with range proofs; omitted)

. . .

2. Payer defines a change output `(a', r')` and a fee

. . .

3. Payer: `r := r_1 + ... + r_n - r' ~> Payee`

. . .

4. Payee defines new outputs `(b_1, s_1), ... (b_m, s_m)` such that `a_1 + ... + a_n + a' + f = b_1 + ... + b_m`

. . .

5. Payee creates a generic signature with the defect key `k = s_1 + ... + s_m - r` and broadcasts it along with the transaction

---

## MimbleWimble blocks & transaction merging

MimbleWimble blocks are organized differently.  There are no explicit transactions.

---

1. List of all inputs `[i_0, ..., i_n]` to transactions included in the block

. . .

2. List of all outputs `[o_0, ..., o_m]`

. . .

3. Total fee `f`

. . .

4. Defects `[K_1, ..., K_l]` and corresponding signatures

---

## Block Validity

* signatures are valid
* `i_0 + ... + i_n + f * G = o_0 + ... + o_m + K_1 + ... + K_l`

_NB:_ There are no individual transactions present, although the list of defects reveals how many there are

---

Exciting property: validity of multiple blocks can be inferred from their net validity.

* Can view the entire history of the blockchain as a merged transaction which destroys some coinbase transactions to produce some new outputs.
* Over time as outputs are destroyed they can be removed from the balancing equation because they are both added and subtracted.

---

## Concise blockchain digest

* Headers
* All _coinbase_ transactions
* All _defects_ with their signatures
* All _unspent outputs_ with range proofs and proofs that they were included in a block

---

## Confidential assets
