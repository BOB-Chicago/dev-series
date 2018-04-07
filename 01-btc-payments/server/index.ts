import * as WebSocket from "ws";
import { Product, Message, Confirmation } from "../lib";
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
      /* ... process order ... */
      const conf = {
        __ctor: "Confirmation"
      } as Confirmation;
      ws.send(JSON.stringify(conf));
    }
  });
});
