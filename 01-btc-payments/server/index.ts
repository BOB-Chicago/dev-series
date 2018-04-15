import * as WebSocket from "ws";
import {
  PaymentMethod,
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
        const conf = {
          __ctor: "Confirmation",
          orderId: id
        } as Confirmation;
        ws.send(JSON.stringify(conf));
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
