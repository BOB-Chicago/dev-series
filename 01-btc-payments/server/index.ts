import * as WebSocket from "ws";
import { Product } from "../lib";
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
  ws.send({
    __type: "Products",
    data: inventory
  });
});
