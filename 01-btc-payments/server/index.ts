import * as WebSocket from "ws";
import {
  Product,
  Message,
  Confirmation,
  PaymentDetails,
  Selection
} from "../lib";
import { readFileSync } from "fs";

if (process.env.INVENTORYDATA === undefined) {
  console.log("INVENTORYDATA must be set");
  process.exit(1);
}

const raw: string = readFileSync(<string>process.env.INVENTORYDATA, "utf8");
const inventory = JSON.parse(raw) as Product[];

const wss = new WebSocket.Server({ port: 8081 });

/* WEBSOCKET SERVER */

wss.on("connection", ws => {
  console.log("CONNECTION");
  const payload = {
    __ctor: "Products",
    data: inventory
  };
  ws.send(JSON.stringify(payload));
  ws.on("message", (raw: string) => {
    const msg = JSON.parse(raw) as Message;
    if (msg.__ctor === "Order") {
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
          // compute the BTC price
          const details = {
            __ctor: "PaymentDetails",
            address: "XXXXX",
            amount: toBtc(total(msg.data))
          } as PaymentDetails;
          ws.send(JSON.stringify(details));
        }
      }
    }
  });
});

function total(ss: Selection[]): number {
  const step = (t: number, s: Selection) => {
    const i = inventory.findIndex(p => p.id === s.product.id);
    return i >= 0 ? t + s.quantity * inventory[i].price : t;
  };
  return ss.reduce(step, 0);
}

function toBtc(cents: number): number {
  return cents / 100 / 7500;
}
