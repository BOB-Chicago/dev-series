import { Product, Selection, Size } from "../lib";

export type Page = "welcome" | "store" | "cart" | "payment" | "confirmation";

export type State = {
  cart: Map<string, Selection>;
  page: Page;
  products: Map<string, Product>;
  selections: Map<string, Selection>;
};

export type EventT =
  | Load
  | Goto
  | CartAdd
  | SizeClick
  | QuantityClick
  | SubmitOrder
  | ConfirmOk;

export interface Load {
  __ctor: "Load";
  products: Map<string, Product>;
}

export interface Goto {
  __ctor: "Goto";
  page: Page;
}

export interface CartAdd {
  __ctor: "CartAdd";
  product: string;
}

export interface SizeClick {
  __ctor: "SizeClick";
  product: string;
  size: Size;
}

export interface QuantityClick {
  __ctor: "QuantityClick";
  product: string;
  action: "up" | "down";
}

export interface SubmitOrder {
  __ctor: "SubmitOrder";
}

export interface ConfirmOk {
  __ctor: "ConfirmOk";
}
