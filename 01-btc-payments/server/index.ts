import * as WebSocket from "ws";
import { BigNumber } from "bignumber.js";
import { HDNode, networks } from "bitcoinjs-lib";
import { openDatabase, spotPrice } from "./Util";
import { txMonitor } from "./Transactions";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  PaymentMethod,
  PaymentDetails,
  Product,
  Message,
  Confirmation,
  Selection,
  sizeIndex,
  Status
} from "../lib";
import * as uuid from "uuid/v4";

/* CONFIGURATION */

const network = networks.testnet;

/* HANDLE SESSION COUNTER */

if (!existsSync("session.dat")) {
  process.stderr.write("Cannot find session counter file\n");
  process.exit(2);
}

const sessionIndex = parseInt(readFileSync("session.dat", "utf8"));
writeFileSync("session.dat", (sessionIndex + 1).toString());

/* LOAD WALLET */

const wallet58 = readFileSync("wallet58.key", "utf8");
const wallet = HDNode.fromBase58(wallet58, network);

/* LOAD CATALOG */

const db = openDatabase();

const catalogSql = "SELECT * FROM catalog";
db.all(catalogSql, startServerWith);

/* WEBSOCKET SERVER */

function startServerWith(err: Error, catalog: Product[]): void {
  process.stdout.write("starting...\n");
  // We won't recover from a failure to retrieve the catalog
  if (err !== null) {
    process.stderr.write(err.toString() + "\n");
    process.exit(1);
  }
  const wss = new WebSocket.Server({ port: 8081 });
  wss.on("connection", ws => {
    process.stdout.write("connection\n");
    const payload = {
      __ctor: "Products",
      data: catalog
    };
    process.stdout.write("sending orders\n");
    ws.send(JSON.stringify(payload));
    ws.on("message", async (raw: string) => {
      const msg = JSON.parse(raw) as Message;
      if (msg.__ctor === "Order") {
        const id = await persistOrder(
          msg.selections,
          msg.streetAddress,
          msg.paymentMethod
        );
        switch (msg.paymentMethod) {
          case PaymentMethod.Credit: {
            process.stdout.write("credit card order received\n");
            /* ... process order ... */
            const conf = {
              __ctor: "Confirmation",
              orderId: id
            } as Confirmation;
            ws.send(JSON.stringify(conf));
            break;
          }
          case PaymentMethod.Bitcoin: {
            process.stdout.write("bitcoin order received\n");
            // compute the BTC price
            const spot = await spotPrice();
            const totalCents = new BigNumber(total(msg.selections, catalog));
            const btcAmount = totalCents
              .dividedBy(100)
              .dividedBy(spot)
              .decimalPlaces(8);
            // generate address
            //
            // Note that this is a totally ad hoc method for generating
            // addresses.  During the presentation, members of the audience
            // pointed out that if our database is lost, we will have to search
            // a very large keyspace for our payments.
            //
            // This issue is addressed by BIP44, which describes a scheme for
            // maintaining a key tree.
            //
            const index = newIndex();
            const address = wallet
              .derive(sessionIndex)
              .derive(index)
              .getAddress();
            persistBitcoin(id, index, btcAmount);
            const details = {
              __ctor: "PaymentDetails",
              address,
              amount: btcAmount.toNumber()
            } as PaymentDetails;
            // watch for the order
            const notification = () =>
              ws.send(
                JSON.stringify({
                  __ctor: "Confirmation",
                  orderId: id
                })
              );
            const watcher = watchFor(
              address,
              btcAmount.multipliedBy("1e8"),
              path(index),
              id,
              notification
            );
            process.stdout.write("watching for payment\n");
            txMonitor.on("txoutput", watcher);
            ws.send(JSON.stringify(details));
          }
        }
      }
    });
  });
}

/* PERSISTENCE */

function persistOrder(
  sels: Selection[],
  address: string,
  method: PaymentMethod
): Promise<string> {
  process.stdout.write("saving order");
  const orderId = uuid();
  const orderSql =
    "INSERT INTO orders VALUES ($orderId, $timestamp, $method, $status, $address)";
  const order = new Promise((resolve, reject) =>
    db.run(
      orderSql,
      {
        $address: address,
        $orderId: orderId,
        $timestamp: timestamp(),
        $method: method,
        $status: method == PaymentMethod.Credit ? Status.Paid : Status.Received
      },
      (err: Error) => {
        if (err !== null) {
          reject(err);
        } else {
          resolve();
        }
      }
    )
  );
  const items = sels.map(
    s =>
      new Promise((resolve, reject) =>
        db.run(
          "INSERT INTO purchases VALUES ($orderId, $itemId, $size, $quantity)",
          {
            $orderId: orderId,
            $itemId: s.product.id,
            $size: sizeIndex(s.size),
            $quantity: s.quantity
          },
          (err: Error) => {
            if (err === null) {
              resolve();
            } else {
              reject(err);
            }
          }
        )
      )
  );
  return Promise.all([order, ...items]).then(() => orderId);
}

function persistBitcoin(
  orderId: string,
  index: number,
  amount: BigNumber
): Promise<void> {
  process.stdout.write("saving bitcoin details");
  return new Promise((resolve, reject) =>
    db.run(
      "INSERT INTO bitcoinPayments (orderId, addressPath, amount) VALUES ($id, $path, $amount)",
      {
        $id: orderId,
        $path: path(index),
        $amount: amount.toString()
      },
      (err: Error) => {
        if (err === null) {
          resolve();
        } else {
          reject(err);
        }
      }
    )
  );
}

function timestamp(): number {
  let ms = Date.now();
  return Math.floor(ms / 1000);
}

function path(aIx: number): string {
  return sessionIndex.toString() + "'/" + aIx.toString();
}

// Compute the total cost of the user's order
function total(ss: Selection[], catalog: Product[]): number {
  const step = (t: number, s: Selection) => {
    const i = catalog.findIndex(p => p.id === s.product.id);
    return i >= 0 ? t + s.quantity * catalog[i].price : t;
  };
  return ss.reduce(step, 0);
}

// Inspect incoming transactions
//
// Members of the audience pointed out that we could learn from what happened
// to MT GOX!  We are supporting address types whose transactions can be
// malleated (P2PKH, P2SH).  So it is possible that some malingerer will
// broadcast malleated versions of our users' payments.  If one of these is
// included in a block, it invalidates the user's original transaction.  The
// result is that the user has paid but we don't find out because of how we are
// watching for payments.
//
function watchFor(
  address: string,
  amount: BigNumber,
  path: string,
  id: string,
  notifyUser: () => void
): (out: [number, string, string]) => void {
  const watcher = ([outAmt, outAddr, txId]: [number, string, string]) => {
    if (outAddr === address && amount.isLessThanOrEqualTo(outAmt)) {
      // Found the tx order
      // order to the confirming bucket
      process.stdout.write("Found a payment we care about\n");
      db.run(
        "UPDATE bitcoinPayments SET txId = $txid WHERE addressPath = $path",
        {
          $txid: txId,
          $path: path
        }
        // FIXME: deal with errors
      );
      db.run(
        "UPDATE orders SET status = $status WHERE id = $id",
        {
          $status: Status.Confirming,
          $id: id
        }
        // FIXME: recover from errors
      );
      // Remove listener
      txMonitor.removeListener("txoutputs", watcher);
      notifyUser();
    }
  };
  return watcher;
}

let addressIndex = 0;
function newIndex(): number {
  const index = addressIndex;
  addressIndex++;
  return index;
}
