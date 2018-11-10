# xmrchain: a stupid tool that pulls block and transaction statistics
#
# Use this code only for prototyping
# -- putting this code into production would be dumb
# -- assuming this code is secure would also be dumb

import requests

limit = 10 # number of recent blocks to fetch

# Return the JSON from a get request
# INPUT
#   url: API endpoint (no base URL)
# OUTPUT
#   JSON returned by the request (list/dict)
def get(url):
    return requests.get('https://xmrchain.net/api'+url).json()

# Start by getting recent blocks
blocks = get('/transactions?limit='+str(limit))['data']['blocks'] # this is a list of blocks

# Now iterate to get all transaction hashes
txs = {} # { height: [tx_hash1,tx_hash2,...] }
print 'Block height: # of txns'
for block in blocks:
    txs[block['height']] = [tx['tx_hash'] for tx in block['txs']]
    print block['height'],len(txs[block['height']])
print ''

# For each tx in a block, get the distribution of number of outputs
inputs = {} # { # of inputs: # of txs}
outputs = {} # { # of outputs: # of txs }
for block in txs:
    for tx_hash in txs[block]:
        # Fetch the tx and get the number of outputs
        tx = get('/transaction/'+tx_hash)['data']
        try:
            num_ins = len(tx['inputs'])
        except:
            num_ins = 0 # coinbase
        num_outs = len(tx['outputs'])
        if num_ins in inputs.keys():
            inputs[num_ins] += 1
        else:
            inputs[num_ins] = 1
        if num_outs in outputs.keys():
            outputs[num_outs] += 1
        else:
            outputs[num_outs] = 1
print '# of inputs: # of tx'
for n in sorted(inputs.keys()):
    print n,inputs[n]
print ''
print '# of outputs: # of tx'
for n in sorted(outputs.keys()):
    print n,outputs[n]
