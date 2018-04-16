import * as WebSocket from "ws";
import { BigNumber } from "bignumber.js";
import { HDNode } from "bitcoinjs-lib";
import { spotPrice } from "./Util";
import { txMonitor } from "./Transactions";
import { readFileSync } from "fs";
import {
  PaymentMethod,
  PaymentDetails,
  Product,
  Message,
  Confirmation,
  Selection,
  sizeIndex
} from "../lib";
import { Database } from "sqlite3";
import * as uuid from "uuid/v4";

if (process.env.DATABASE === undefined) {
  process.stderr.write("DATABASE environment variable must be set");
  process.exit(1);
}

/* LOAD WALLET */

const wallet58 = readFileSync("wallet58.key", "utf8");
const wallet = HDNode.fromBase58(wallet58);

/* LOAD CATALOG */

const dbFile = process.env.DATABASE as string;
const db = new Database(dbFile);

const catalogSql = "SELECT * FROM catalog";
db.all(catalogSql, startServerWith);

/* WEBSOCKET SERVER */

function startServerWith(err: Error, catalog: Product[]): void {
  // We won't recover from a failure to retrieve the catalog
  if (err !== null) {
    process.stderr.write(err.toString());
    process.exit(1);
  }
  const wss = new WebSocket.Server({ port: 8081 });
  wss.on("connection", ws => {
    console.log("CONNECTION");
    const payload = {
      __ctor: "Products",
      data: catalog
    };
    ws.send(JSON.stringify(payload));
    ws.on("message", async (raw: string) => {
      const msg = JSON.parse(raw) as Message;
      if (msg.__ctor === "Order") {
        /* ... process order ... */
        const id = await persist(msg.selections, msg.streetAddress);
        switch (msg.paymentMethod) {
          case "credit": {
            /* ... process order ... */
            console.log(msg.data);
            const conf = {
              __ctor: "Confirmation"
            } as Confirmation;
            ws.send(JSON.stringify(conf));
            break;
          }
          case "bitcoin": {
            // generate address
            const address = wallet.derive(oid).getAddress();
            // compute the BTC price
            const spot = await spotPrice();
            const totalCents = new BigNumber(total(msg.data));
            const btcAmount = totalCents
              .dividedBy(100)
              .dividedBy(spot)
              .decimalPlaces(8);
            // persist the order
            const details = {
              __ctor: "PaymentDetails",
              address,
              amount: btcAmount.toNumber()
            } as PaymentDetails;
            // watch for the order
            txMonitor.on(
              "btctx",
              watchFor(address, btcAmount.multipliedBy("1e8"))
            );
            ws.send(JSON.stringify(details));
          }
        }
      }
    });
  });
}

/* PERSISTENCE */

enum Status {
  Received,
  Paid,
  Processing,
  Shipped
}

function persist(sels: Selection[], address: string): Promise<string> {
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
        $method: PaymentMethod.Credit,
        $status: Status.Paid
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
          `INSERT INTO purchases VALUES ($orderId, $itemId, $size, $quantity)`,
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

function timestamp(): number {
  let ms = Date.now();
  return Math.floor(ms / 1000);
}

// Compute the total cost of the user's order
function total(ss: Selection[]): number {
  const step = (t: number, s: Selection) => {
    const i = catalog.findIndex(p => p.id === s.product.id);
    return i >= 0 ? t + s.quantity * catalog[i].price : t;
  };
  return ss.reduce(step, 0);
}

// Inpect incoming transactions
function watchFor(
  address: string,
  amount: BigNumber
): (out: [number, string]) => void {
  return ([outAmt, outAddr]) => {
    if (outAddr === address && amount.isLessThanOrEqualTo(outAmt)) {
      // Found the tx order
      // order to the confirming bucket
    }
  };
}
