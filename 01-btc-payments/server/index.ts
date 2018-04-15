import * as WebSocket from "ws";
import { BigNumber } from "bignumber.js";
import {
  Product,
  Message,
  Confirmation,
  PaymentDetails,
  Selection
} from "../lib";
import { spotPrice } from "./Util";
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
  ws.on("message", async (raw: string) => {
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
          const address = "XXXXX";
          // compute the BTC price
          const spot = await spotPrice();
          const totalCents = new BigNumber(total(msg.data));
          const btcAmount = totalCents
            .dividedBy(100)
            .dividedBy(spot)
            .decimalPlaces(8);
          const details = {
            __ctor: "PaymentDetails",
            address,
            amount: btcAmount.toNumber()
          } as PaymentDetails;
          ws.send(JSON.stringify(details));
        }
      }
    }
  });
});

// Compute the total cost of the user's order
function total(ss: Selection[]): number {
  const step = (t: number, s: Selection) => {
    const i = inventory.findIndex(p => p.id === s.product.id);
    return i >= 0 ? t + s.quantity * inventory[i].price : t;
  };
  return ss.reduce(step, 0);
}
