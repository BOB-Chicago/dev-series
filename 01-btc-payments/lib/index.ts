/* DATA MODEL */

export type Size = "S" | "M" | "L";

export interface Selection {
  product: Product;
  quantity: number;
  size: Size | null;
}

export type Message = Products | Order | Confirmation;

export interface Products {
  __ctor: "Products";
  data: Product[];
}

export interface Product {
  id: string;
  caption: string;
  price: number;
}

export interface Order {
  __ctor: "Order";
  data: Selection[];
}

export interface Confirmation {
  __ctor: "Confirmation";
}
