import { Product, Selection, Size } from "../lib";

export type Page =
  | "btcPayment"
  | "cart"
  | "confirmation"
  | "payment"
  | "store"
  | "welcome";

export type State = {
  cart: Map<string, Selection>;
  page: Page;
  payment: null | { address: string; amount: number };
  products: Map<string, Product>;
  selections: Map<string, Selection>;
};

export type EventT =
  | CartAdd
  | ConfirmOk
  | Goto
  | Load
  | PaymentDetails
  | QuantityClick
  | SizeClick
  | SubmitOrder;

export interface ConfirmOk {
  __ctor: "ConfirmOk";
}

export interface CartAdd {
  __ctor: "CartAdd";
  product: string;
}

export interface Goto {
  __ctor: "Goto";
  page: Page;
}

export interface Load {
  __ctor: "Load";
  products: Map<string, Product>;
}

export interface PaymentDetails {
  __ctor: "PaymentDetails";
  address: string;
  amount: number;
}

export interface QuantityClick {
  __ctor: "QuantityClick";
  product: string;
  action: "up" | "down";
}

export interface SizeClick {
  __ctor: "SizeClick";
  product: string;
  size: Size;
}

export interface SubmitOrder {
  __ctor: "SubmitOrder";
  btc: boolean;
}
