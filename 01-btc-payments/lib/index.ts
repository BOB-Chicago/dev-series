/* DATA MODEL */

export type Message = Products;

export interface Products {
	__type: "Products";
	data: Product[];
}

export interface Product {
	id: string;
	caption: string;
	price: number;
}
