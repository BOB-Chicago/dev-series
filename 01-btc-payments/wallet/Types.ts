export namespace Input {
  // derive-pubkey
  // derive-privkey
  export interface Derive {
    wallet58: string;
    paths: string[];
  }
  // spend
  export interface Spend {
    txs: {
      inputs: {
        fullPath: string;
        txId: string;
        vout: number;
      }[];
      outputs: {
        address: string;
        amount: number;
      }[];
    }[];
    wallet58: string;
  }
}

// Output types
export namespace Output {
  // derive-pubkey
  // devive-privkey
  export type Derive = string[];
  // new
  export type New = string;
  // spend
  export type Spend = string[];
}
