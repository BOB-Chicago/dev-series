import { request } from "https";
import { Database } from "sqlite3";

// Get the BTC spot price in dollars from Coinbase
export function spotPrice(): Promise<number> {
  const options = {
    hostname: "api.coinbase.com",
    path: "/v2/prices/BTC-USD/spot",
    method: "GET"
  };
  interface CoinbaseResponse {
    data: {
      amount: string;
      base: string;
      currency: string;
    };
  }
  return new Promise((cont, fail) => {
    const req = request(options, res => {
      res.setEncoding("utf8");
      res.on("data", (raw: string) => {
        const msg = JSON.parse(raw) as CoinbaseResponse;
        cont(parseFloat(msg.data.amount));
      });
    });
    req.on("error", err => fail(err));
    req.end();
  });
}

export function openDatabase(): Database {
  if (process.env.DATABASE === undefined) {
    process.stderr.write("DATABASE environment variable must be set");
    process.exit(1);
  }

  const dbFile = process.env.DATABASE as string;
  const db = new Database(dbFile);
  return db;
}
