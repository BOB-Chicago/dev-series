Dive into Monero
====

Here are solutions to the tasks that we covered in the workshop:

- `dumb25519.py`: useful for algorithm testing only; it is neither compatible 
  with Monero's encoding nor cryptographically secure, and should not be used 
  for any production work
- `schnorr.py`: working version of the Schnorr signature task
- `pedersen.py`: working version of the Pedersen commitment sum task
- `xmrchain.py`: working version of the xmrchain.net API task
- `rpc.py`: working (but incomplete) version of the daemon RPC task

Please refer to https://github.com/SarangNoether/research-lab for the full repository.

### Working with the solutions

The only dependency outside Python standard libraries is `requests` which is 
available from many distro package managers as `python2-requests`.

