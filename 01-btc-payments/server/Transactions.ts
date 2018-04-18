import { address, networks, Transaction } from "bitcoinjs-lib";
import { socket } from "zmq";
import * as EventEmitter from "events";

const bitcoindSocket = "tcp://127.0.0.1:6164";

/* TRANSACTION MONITOR */

/**
 * We expose an EventEmitter which emits "btctx" events containing simplified
 * transaction data.
 */
export const txMonitor = new EventEmitter();

// bitcoind uses ZeroMQ to broadcast messages about bitcoin blocks and
// transactions to other programs running on the same system.
const sock = socket("sub");
sock.connect(bitcoindSocket);
sock.subscribe("rawtx");

sock.on("message", (topic, rawtx) => {
  const outs = parseRawTx(rawtx);
  outs.forEach(x => txMonitor.emit("txoutput", x));
});

function parseRawTx(raw: Buffer): Array<[number, string, string]> {
  const tx = Transaction.fromBuffer(raw);
  const res: Array<[number, string, string]> = [];
  // Prepare the outputs
  for (let out of tx.outs) {
    const { value, script } = out;
    try {
      res.push([
        value,
        address.fromOutputScript(script, networks.testnet),
        tx.getId()
      ]);
    } catch (err) {
      process.stderr.write(err.toString() + "\n");
      // ignore
    }
  }
  return res;
}
