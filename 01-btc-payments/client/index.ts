// Client side functionality

import { Projector, VNode, createProjector, h } from "maquette";
import { Product, Message } from "../lib";

/* DATA */

type Size = "S" | "M" | "L";

type Selection = {
  id: string;
  size: Size | null;
  quantity: number;
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
  const toCheckout = (ev: MouseEvent) => {
    projector.replace(root, checkout);
  };
  return h("div.container", [
    h("div.row", [h("h1", ["Bitcoin & Open Blockchain Store"])]),
    h("div.row", [
      h("div.col", { onclick: toCart }, ["view cart"]),
      h("div.col", { onclick: toCheckout }, ["checkout"])
    ]),
    h("div.row", state.products.map(renderProduct))
  ]);
}

function renderProduct(p: Product): VNode {
  const sel: Selection = {
    id: p.id,
    size: null,
    quantity: 0
  };
  return h("div.product", [
    h("div.row", [p.caption]), // caption
    h("div.row", [h("img", { src: `assets/${p.id}.png` })]), // image
    sizes(sel), // sizes
    quantity(sel), // quantity
    addToCart(sel)
  ]);
}

function sizes(sel: Selection): VNode {
  function f(s: Size): (e: MouseEvent) => void {
    return e => {
      sel.size = s;
    };
  }
  return h(
    "div.row",
    (["S", "M", "L"] as Size[]).map(s =>
      h("div.col-sm", { onclick: f(s) }, [s])
    )
  );
}

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

function addToCart(sel: Selection): VNode {
  const f = (ev: MouseEvent) => {
    for (let s of state.selections) {
      if (s.id === sel.id && s.size === sel.size) {
        s.quantity += sel.quantity;
        return;
      }
    }
    state.selections.push(sel);
  };
  return h("div.row", { onclick: f }, ["Add to cart"]);
}

// Shopping cart
function cart(): VNode {
  const rows = state.selections.map(s => {
    return h("div.row", [
      h("div.col-sm", [s.id]),
      h("div.col-sm", [s.size]),
      h("div.col-sm", [s.quantity])
    ]);
  });

  return h("div.container", [
    h("div.row", ["Shopping cart"]),
    rows.length > 0 ? rows : "No items"
  ]);
}

// Checkout page
function checkout(): VNode {
  return h("div.container", ["checkout"]);
}

projector.replace(root, welcome);
