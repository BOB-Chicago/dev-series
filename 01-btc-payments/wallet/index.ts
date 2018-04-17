// WALLET
//
// Subcommands:
// - new
// - derive-pubkey
// - derive-privkey
// - spend

import { HDNode, TransactionBuilder, networks } from "bitcoinjs-lib";
import { randomBytes } from "crypto";

import { Input } from "./Types";

if (typeof process.argv[2] === "undefined") {
  process.stderr.write("See readme for usage");
  process.exit(1);
}

const cmd = process.argv[2];

switch (cmd) {
  case "new": {
    // Generate a brand new wallet
    newWallet();
    break;
  }
  case "spend": {
    // Generate a raw transaction
    spend();
    break;
  }
  case "derive-pubkey": {
    deriveKey(false);
    break;
  }
  case "derive-privkey": {
    deriveKey(true);
    break;
  }
  default: {
    process.stderr.write("Unrecognized command: " + cmd);
    process.exit(2);
  }
}

function deriveKey(priv: boolean) {
  // Read derivation pathway from stdin
  let data = "";
  process.stdin.on("data", chunk => {
    data += chunk;
  });
  process.stdin.on("end", () => {
    const { wallet58, paths } = JSON.parse(data) as Input.Derive;
    const wallet = HDNode.fromBase58(wallet58);
    const b58s = paths.map(path => {
      const newKey = wallet.derivePath(path);
      return priv ? newKey.toBase58() : newKey.neutered().toBase58();
    });
    process.stdout.write(JSON.stringify(b58s));
  });
}

function newWallet() {
  const wallet = HDNode.fromSeedBuffer(randomBytes(64));
  process.stdout.write(JSON.stringify(wallet.toBase58()));
}

function spend() {
  let data = "";
  process.stdin.on("data", chunk => {
    data += chunk;
  });
  process.stdin.on("end", () => {
    const sp = JSON.parse(data) as Input.Spend;
    const wallet = HDNode.fromBase58(sp.wallet58);
    const signed = sp.txs.map(tx => {
      let txb = new TransactionBuilder(networks.testnet /* TESTNET */);
      tx.outputs.forEach(out => txb.addOutput(out.address, out.amount));
      for (let i = 0; i < tx.inputs.length; i++) {
        txb.addInput(tx.inputs[i].txId, tx.inputs[i].vout);
        txb.sign(i, wallet.derivePath(tx.inputs[i].fullPath).keyPair);
      }
      return txb.build().toHex();
    });
    process.stdout.write(JSON.stringify(signed));
  });
}
