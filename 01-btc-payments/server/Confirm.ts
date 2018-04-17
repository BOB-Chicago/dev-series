// Make sure that payments are confirming

import * as RpcClient from "bitcoind-rpc";

import { openDatabase } from "./Util";
import { PaymentMethod, Status } from "../lib";

const nBlocks = process.argv[2] === undefined ? 10 : parseInt(process.argv[2]);

const db = openDatabase();

const config = {
  protocol: "http",
  user: "user",
  password: "pass",
  host: "127.0.0.1",
  port: "6163"
};

const rpc = new RpcClient(config);

// We need the outstanding records
const sql =
  "SELECT id, txHash FROM orders JOIN bitcoinPayments ON id = orderId WHERE orders.paymentMethod = $method AND orders.status = $status";
db.all(
  sql,
  {
    $paymentMethod: PaymentMethod.Bitcoin,
    $status: Status.Confirming
  },
  withResults
);

interface Row {
  id: string;
  txHash: string;
}

function withResults(err: Error, rows: Row[]) {
  if (err !== null) {
    process.stderr.write("Problem fetching results: " + err.toString());
    process.exit(1);
  }

  rows.forEach(async (row: Row) => {
    // Get information about the txHash
    const d = await txDepth(row.txHash);
    if (d >= nBlocks) {
      db.run("UPDATE orders SET status = $status WHERE id = $id", {
        $status: Status.Paid,
        $id: row.id
      });
    }
  });
}

function txDepth(hash: string): Promise<number> {
  return new Promise((resolve, fail) => {
    interface Res {
      confirmations: number;
    }
    rpc.getRawTransaction(hash, true, (err: Error, res: Res) => {
      if (err !== null) {
        fail(err);
      }
      resolve(res.confirmations);
    });
  });
}
