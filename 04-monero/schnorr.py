# Schnorr: a stupid implementation of Schnorr signatures
#
# Use this code only for prototyping
# -- putting this code into production would be dumb
# -- assuming this code is secure would also be dumb

from dumb25519 import *

# Generate a Schnorr signature
# INPUT
#   x: private key (Scalar)
#   M: message (any string-representable type)
# OUTPUT
#   signature (Scalar,Scalar)
def sign(x,M):
    if not isinstance(x,Scalar):
        raise TypeError
    try:
        str(M)
    except:
        raise TypeError

    r = random_scalar()
    c = hash_to_scalar(G*r,M)

    return r-x*c,c

# Verify a Schnorr signature
# INPUT
#   s,c: signature (Scalar,Scalar)
#   X: public key (Point)
#   M: message (any string-representable type)
# OUTPUT
#   none (raises ArithmeticError on failure)
def verify(s,c,X,M):
    if not isinstance(s,Scalar) or not isinstance(c,Scalar) or not isinstance(X,Point):
        raise TypeError
    try:
        str(M)
    except:
        raise TypeError

    if not hash_to_scalar(G*s+X*c,M) == c:
        raise ArithmeticError

x = random_scalar()
X = G*x
M = 'I was saying Boo-urns...'

# This should pass
s,c = sign(x,M)
verify(s,c,X,M)

# These should fail
try:
    verify(s,c,random_point(),M)
    raise Exception
except ArithmeticError:
    pass

try:
    verify(s,c,X,'Evil message')
    raise Exception
except ArithmeticError:
    pass
