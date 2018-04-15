import { address, Transaction } from "bitcoinjs-lib";
import { socket } from "zmq";
import * as EventEmitter from "events";

const bitcoindSocket = "ipc:///tmp/bitcoind";

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

function parseRawTx(raw: Buffer): Array<[number, string]> {
  const tx = Transaction.fromBuffer(raw);
  // Prepare the outputs
  return tx.outs.map(
    ({ value, script }) =>
      [value, address.fromOutputScript(script)] as [number, string]
  );
}
