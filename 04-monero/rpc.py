# RPC: a stupid tool that pulls block statistics from a Monero daemon
#
# Use this code only for prototyping
# -- putting this code into production would be dumb
# -- assuming this code is secure would also be dumb

import requests
import json

NODE = 'http://node.moneroworld.com'
PORT = 18089

limit = 10 # number of recent blocks to fetch

def post(method,data=None):
    if data is None:
        data = {}
    data['jsonrpc'] = '2.0'
    data['method'] = method
    headers = {'Content-Type':'application/json'}
    return requests.post(NODE+':'+str(PORT)+'/json_rpc',headers=headers,data=json.dumps(data)).json()

def post_custom(endpoint):
    headers = {'Content-Type':'application/json'}
    return requests.post(NODE+':'+str(PORT)+'/'+endpoint,headers=headers).json()

height = post_custom('get_height')['height']
print 'Block height: # of non-coinbase txns'
for n in range(limit):
    block = post('get_block',{'params':{'height':height-n-1}})
    print height-n-1,len(json.loads(block['result']['json'])['tx_hashes'])
