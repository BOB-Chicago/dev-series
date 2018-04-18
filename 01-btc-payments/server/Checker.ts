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
const sql = `SELECT id, txId FROM orders 
   JOIN bitcoinPayments ON orders.id = bitcoinPayments.orderId 
   WHERE orders.paymentMethod = $paymentMethod AND orders.status = $status`;

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
  txId: string;
}

function withResults(err: Error, rows: Row[]) {
  if (err !== null) {
    process.stderr.write("Problem fetching results: " + err.toString() + "\n");
    process.exit(1);
  }

  rows.forEach(async (row: Row) => {
    // Get information about the txId
    try {
      const d = await txDepth(row.txId);
      if (d >= nBlocks) {
        process.stdout.write(`Updating status for ${row.id}\n`);
        db.run("UPDATE orders SET status = $status WHERE id = $id", {
          $status: Status.Paid,
          $id: row.id
        });
      }
    } catch (err) {
      // do nothing
      process.stderr.write(err.toString() + "\n");
    }
  });
}

function txDepth(hash: string): Promise<number> {
  return new Promise((resolve, fail) => {
    interface Res {
      result: {
        confirmations: number;
      };
    }
    rpc.getTransaction(hash, true, (err: Error, res: Res) => {
      if (err !== null) {
        fail(err);
      } else {
        resolve(res.result.confirmations);
      }
    });
  });
}
