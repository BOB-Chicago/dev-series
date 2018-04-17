import * as WebSocket from "ws";
import { BigNumber } from "bignumber.js";
import { HDNode } from "bitcoinjs-lib";
import { spotPrice } from "./Util";
import { txMonitor } from "./Transactions";
import { existsSync, readFileSync, writeFileSync } from "fs";
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
  let addrIndex = 0;
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
        const id = await persistOrder(
          msg.selections,
          msg.streetAddress,
          msg.paymentMethod
        );
        switch (msg.paymentMethod) {
          case PaymentMethod.Credit: {
            /* ... process order ... */
            const conf = {
              __ctor: "Confirmation",
              orderId: id
            } as Confirmation;
            ws.send(JSON.stringify(conf));
            break;
          }
          case PaymentMethod.Bitcoin: {
            // compute the BTC price
            const spot = await spotPrice();
            const totalCents = new BigNumber(total(msg.selections, catalog));
            const btcAmount = totalCents
              .dividedBy(100)
              .dividedBy(spot)
              .decimalPlaces(8);
            // generate address
            const address = wallet
              .derive(sessionIndex)
              .derive(addrIndex)
              .getAddress();
            addrIndex++;
            persistBitcoin(id, addrIndex, btcAmount);
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

function persistOrder(
  sels: Selection[],
  address: string,
  method: PaymentMethod
): Promise<string> {
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

function persistBitcoin(
  orderId: string,
  index: number,
  amount: BigNumber
): Promise<void> {
  const addressPath = sessionIndex.toString() + "/" + index.toString();
  return new Promise((resolve, reject) =>
    db.run(
      "INSERT INTO purchases VALUE ($id, $path, $amount)",
      {
        $id: orderId,
        $path: addressPath,
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
  amount: BigNumber
): (out: [number, string]) => void {
  return ([outAmt, outAddr]) => {
    if (outAddr === address && amount.isLessThanOrEqualTo(outAmt)) {
      // Found the tx order
      // order to the confirming bucket
    }
  };
}
