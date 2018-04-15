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
  paymentAddress: string | null;
  products: Map<string, Product>;
  selections: Map<string, Selection>;
};

export type EventT =
  | CartAdd
  | ConfirmOk
  | Goto
  | Load
  | PaymentAddress
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

export interface PaymentAddress {
  __ctor: "PaymentAddress";
  address: string;
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
}
