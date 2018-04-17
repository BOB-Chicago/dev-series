import * as WebSocket from "ws";
import { BigNumber } from "bignumber.js";
import { HDNode } from "bitcoinjs-lib";
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

/* HANDLE SESSION COUNTER */

if (!existsSync("session.dat")) {
  process.stderr.write("Cannot find session counter file");
  process.exit(2);
}

const sessionIndex = parseInt(readFileSync("session.dat", "utf8"));
writeFileSync("session.dat", (sessionIndex + 1).toString());

/* LOAD WALLET */

const wallet58 = readFileSync("wallet58.key", "utf8");
const wallet = HDNode.fromBase58(wallet58);

/* LOAD CATALOG */

const db = openDatabase();

const catalogSql = "SELECT * FROM catalog";
db.all(catalogSql, startServerWith);

/* WEBSOCKET SERVER */

function startServerWith(err: Error, catalog: Product[]): void {
  process.stdout.write("starting...");
  // We won't recover from a failure to retrieve the catalog
  if (err !== null) {
    process.stderr.write(err.toString());
    process.exit(1);
  }
  const wss = new WebSocket.Server({ port: 8081 });
  wss.on("connection", ws => {
    process.stdout.write("connection");
    const payload = {
      __ctor: "Products",
      data: catalog
    };
    process.stdout.write("sending orders");
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
            process.stdout.write("credit card order received");
            /* ... process order ... */
            const conf = {
              __ctor: "Confirmation",
              orderId: id
            } as Confirmation;
            ws.send(JSON.stringify(conf));
            break;
          }
          case PaymentMethod.Bitcoin: {
            process.stdout.write("bitcoin order received");
            // compute the BTC price
            const spot = await spotPrice();
            const totalCents = new BigNumber(total(msg.selections, catalog));
            const btcAmount = totalCents
              .dividedBy(100)
              .dividedBy(spot)
              .decimalPlaces(8);
            // generate address
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
            const watcher = watchFor(
              address,
              btcAmount.multipliedBy("1e8"),
              path(index),
              id
            );
            process.stdout.write("watching for payment");
            txMonitor.on("btctx", watcher);
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
  return sessionIndex.toString() + "/" + aIx.toString();
}

// Compute the total cost of the user's order
function total(ss: Selection[], catalog: Product[]): number {
  const step = (t: number, s: Selection) => {
    const i = catalog.findIndex(p => p.id === s.product.id);
    return i >= 0 ? t + s.quantity * catalog[i].price : t;
  };
  return ss.reduce(step, 0);
}

// Inpect incoming transactions
function watchFor(
  address: string,
  amount: BigNumber,
  path: string,
  id: string
): (out: [number, string, string]) => void {
  const watcher = ([outAmt, outAddr, txHash]: [number, string, string]) => {
    if (outAddr === address && amount.isLessThanOrEqualTo(outAmt)) {
      // Found the tx order
      // order to the confirming bucket
      process.stdout.write("Found a payment we care about");
      db.run(
        "UPDATE bitcoinPayments SET txHash = $hash WHERE addressPath = $path",
        {
          $hash: txHash,
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
    }
    // Remove listener
    txMonitor.removeListener("btctx", watcher);
  };
  return watcher;
}

let addressIndex = 0;
function newIndex(): number {
  const index = addressIndex;
  addressIndex++;
  return index;
}
