# Pedersen: a stupid implementation of Pedersen commitment sums
#
# Use this code only for prototyping
# -- putting this code into production would be dumb
# -- assuming this code is secure would also be dumb

from dumb25519 import *

H = hash_to_point('dumb25519 H')

# Produce a Pedersen commitment
# INPUT
#   x: value (Scalar)
#   r: randomness (Scalar)
# OUTPUT
#   commitment (Point)
def commit(x,r):
    if not isinstance(x,Scalar) or not isinstance(r,Scalar):
        raise TypeError

    return G*x+H*r

# Given a list of commitments and randomness, determine if the values sum to zero
# INPUT
#   coms: commitments (Point list)
#   rands: randomness (Scalar list)
# OUTPUT
#   True (if value sum is zero) or False
def zero(coms,rands):
    for C in coms:
        if not isinstance(C,Point):
            raise TypeError
    for r in rands:
        if not isinstance(r,Scalar):
            raise TypeError
    if not len(coms) == len(rands):
        raise IndexError

    C_sum = Z
    for C in coms:
        C_sum += C
    
    r_sum = Scalar(0)
    for r in rands:
        r_sum += r

    return C_sum == H*r_sum

# Generate a sum test that should pass
# INPUT
#   n: number of commitments (int > 0)
# OUTPUT
#   coms: commitments (Point list)
#   rands: randomness (Salar list)
def test_pass(n):
    if not isinstance(n,int):
        raise TypeError
    if not n > 0:
        raise ValueError

    vals = Scalar(0) # value sum
    rands = [] # randomness (r)
    coms = [] # commitments

    if n == 1:
        rands.append(random_scalar())
        coms.append(commit(Scalar(0),rands[0]))
        return coms,rands

    # These are random
    for i in range(n-1):
        val = random_scalar()
        vals += val
        rands.append(random_scalar())
        coms.append(commit(val,rands[-1]))
    # This sums to zero
    rands.append(random_scalar())
    coms.append(commit(-vals,rands[-1]))
    return coms,rands

coms,rands = test_pass(1)
assert zero(coms,rands) == True

coms,rands = test_pass(2)
assert zero(coms,rands) == True

coms,rands = test_pass(3)
assert zero(coms,rands) == True
