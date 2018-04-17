import { Product, Selection, Size } from "../lib";

export type Page =
  | "btcPayment"
  | "cart"
  | "confirmation"
  | "payment"
  | "store"
  | "welcome";

export type State = Blank | Shopping | Checkout | BitcoinPayment | OrderSummary;

export interface App {
  cart: Map<string, Selection>;
  page: Page;
  products: Map<string, Product>;
}

export interface Blank {
  __ctor: "Blank";
  page: "welcome";
}

export interface Shopping extends App {
  __ctor: "Shopping";
  selections: Map<string, Selection>;
}

export interface Checkout extends App {
  __ctor: "Checkout";
  streetAddress: string;
}

export interface BitcoinPayment extends App {
  __ctor: "BitcoinPayment";
  bitcoinAddress: string;
  amount: number;
}

export interface OrderSummary extends App {
  __ctor: "OrderSummary";
  orderId: string;
}

export type EventT =
  | CartAdd
  | ConfirmOk
  | Goto
  | GotOrderId
  | Load
  | PaymentDetails
  | QuantityClick
  | SizeClick
  | SubmitOrder
  | UserDetails;

export interface CartAdd {
  __ctor: "CartAdd";
  product: string;
}

export interface ConfirmOk {
  __ctor: "ConfirmOk";
}

export interface Goto {
  __ctor: "Goto";
  page: Page;
}

export interface GotOrderId {
  __ctor: "GotOrderId";
  orderId: string;
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

export interface UserDetails {
  __ctor: "UserDetails";
  streetAddress: string;
}
