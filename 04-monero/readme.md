Dive into Monero
====

Slides
--

The slides from the talk are available at `slides.pdf` and present some tasks
we went over during the workshop.

Code
--

This repo contains `dumb25519.py`, an ECC library.  It is neither compatible 
with Monero's encoding nor cryptographically secure, and should not be used for 
any production work.  The library is intended to make playing around with ECC 
really easy.

There are also solutions to the workshop tasks (slides should be posted soon):

- `schnorr.py`: working version of the Schnorr signature task
- `pedersen.py`: working version of the Pedersen commitment sum task
- `xmrchain.py`: working version of the xmrchain.net API task
- `rpc.py`: working (but incomplete) version of the daemon RPC task

Please refer to https://github.com/SarangNoether/research-lab for the full repository.

### Working with the solutions

The only dependency outside Python standard libraries is `requests` which is 
available from many distro package managers as `python2-requests`.

