// Client side functionality

import { Projector, VNode, createProjector, h } from "maquette";
import { Product, Message } from "../lib";

/* DATA */

type Size = "S" | "M" | "L";

type Selection = {
  product: Product;
  quantity: number;
  size: Size | null;
};

type State = {
  products: Product[];
  selections: Selection[];
};

const state: State = {
  products: [],
  selections: []
};

/* DOM */

const root = document.getElementById("root") as Element;

/* WEBSOCKET */

const ws: WebSocket = new WebSocket("wss://localhost:8081");
const projector: Projector = createProjector();

ws.addEventListener("message", (e: MessageEvent) => {
  const msg = e.data as Message;
  switch (msg.__type) {
    case "Products": {
      projector.replace(root, store);
      break;
    }
  }
});

/* CONTINUATIONS */

function addToCart(sel: Selection): (ev: MouseEvent) => void {
  const f = (ev: MouseEvent) => {
    for (let s of state.selections) {
      if (s.product.id === sel.product.id && s.size === sel.size) {
        s.quantity += sel.quantity;
        return;
      }
    }
    state.selections.push(sel);
  };
  return f;
}

/* VIEWS */

// Welcome!
function welcome(): VNode {
  return h("div.container", [
    "Welcome to the Bitcoin & Open Blockchain meetup store!"
  ]);
}

// T-shirt store
function store(): VNode {
  const toCart = (ev: MouseEvent) => {
    projector.replace(root, cart);
  };
  const toPayment = (ev: MouseEvent) => {
    projector.replace(root, payment);
  };
  return h("div.container", [
    h("div.row", [h("h1", ["Bitcoin & Open Blockchain Store"])]),
    h("div.row", [
      h("div.col", { onclick: toCart }, ["view cart"]),
      h("div.col", { onclick: toPayment }, ["checkout"])
    ]),
    h("div.row", state.products.map(renderProduct))
  ]);
}

function renderProduct(p: Product): VNode {
  const sel: Selection = {
    product: p,
    quantity: 0,
    size: null
  };
  return h("div.product", [
    h("div.row", [p.caption]), // caption
    h("div.row", [h("img", { src: `assets/${p.id}.png` })]), // image
    sizes(sel), // sizes
    quantity(sel), // quantity
    h("div.row", { onclick: addToCart(sel) }, ["Add to cart"])
  ]);
}

// Simple size selector
function sizes(sel: Selection): VNode {
  function f(s: Size): (e: MouseEvent) => void {
    return e => {
      sel.size = s;
    };
  }
  return h(
    "div.row",
    (["S", "M", "L"] as Size[]).map(s => {
      const cl = s == sel.size ? "selected" : "";
      return h("div.col-sm", { onclick: f(s), class: cl }, [s]);
    })
  );
}

// Simple quantity updater: "(-) q (+)"
function quantity(sel: Selection): VNode {
  const up = (ev: MouseEvent) => {
    sel.quantity++;
  };
  const down = (ev: MouseEvent) => {
    sel.quantity = Math.max(0, sel.quantity - 1);
  };
  return h("div.row", [
    h("div.col-sm", { onclick: down }, ["(-)"]),
    h("div.col-sm", [sel.quantity]),
    h("div.col-sm", { onclick: up }, ["(+)"])
  ]);
}

// Shopping cart
function cart(): VNode {
  let total = 0;
  const rows = state.selections.map(s => {
    total += s.quantity * s.product.price;
    return h("div.row", [
      cols([
        s.product.caption,
        s.size as string,
        s.quantity.toString(),
        (s.quantity * s.product.price).toString()
      ])
    ]);
  });
  return h("div.container", [
    h("div.row", ["Shopping cart"]),
    h("div.row", cols(["Desc", "Size", "Quantity", "Price"])),
    rows.length > 0 ? rows : "No items",
    h("div.row", ["Total: " + total.toString()])
  ]);
}

// Payment page
function payment(): VNode {
  const f = (ev: MouseEvent) => {
    projector.replace(root, confirmation);
  };
  return h("div.container", [
    h("div.row", ["Pay with a credit card..."]),
    h("div.row", [h("div.button", { onclick: f }, ["GO!"])])
  ]);
}

// Confirmation
function confirmation(): VNode {
  const f = (ev: MouseEvent) => {
    state.selections = [];
    projector.replace(root, store);
  };
  const rows = state.selections.map(s =>
    h(
      "div.row",
      cols([s.product.caption, s.size as string, s.quantity.toString()])
    )
  );
  return h("div.container", [
    h("div.row", ["Success!"]),
    rows,
    h("div.row", { onclick: f }, ["OK"])
  ]);
}

/* HELPERS */

function cols(xs: string[]): VNode[] {
  return xs.map(x => h("div.col-sm", [x]));
}

projector.replace(root, welcome);
