// Client side functionality

import { Projector, VNode, createProjector, h } from "maquette";
import { Product, Message, Selection, Size, Order } from "../lib";

/* DATA */

type Page = "welcome" | "store" | "cart" | "payment" | "confirmation";

type State = {
  products: Product[];
  selections: Selection[];
  page: Page;
};

const state: State = {
  products: [],
  selections: [],
  page: "welcome"
};

/* WEBSOCKET */

const ws: WebSocket = new WebSocket("ws://localhost:8081");
const projector: Projector = createProjector();

ws.addEventListener("message", (e: MessageEvent) => {
  const msg = JSON.parse(e.data) as Message;
  switch (msg.__type) {
    case "Products": {
      state.products = msg.data;
      state.page = "store";
      break;
    }
    case "Confirmation": {
      state.page = "confirmation";
    }
  }
  projector.scheduleRender();
});

/* CONTINUATIONS */

function addToCart(sel: Selection): (ev: MouseEvent) => void {
  const f = (ev: MouseEvent) => {
    console.log("ADD TO CART");
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

function render(): VNode {
  console.log("RENDERING!");
  console.log(state);
  switch (state.page) {
    case "welcome": {
      return welcome();
    }
    case "store": {
      return store();
    }
    case "cart": {
      return cart();
    }
    case "payment": {
      return payment();
    }
    case "confirmation": {
      return confirmation();
    }
  }
}

// Welcome!
function welcome(): VNode {
  return h("div.container", [
    "Welcome to the Bitcoin & Open Blockchain meetup store!"
  ]);
}

// T-shirt store
function store(): VNode {
  const toCart = (ev: MouseEvent) => {
    state.page = "cart";
    projector.scheduleRender();
  };
  const toPayment = (ev: MouseEvent) => {
    state.page = "payment";
    projector.scheduleRender();
  };
  return h("div.container", [
    h("div.row", { key: 1 }, [h("h1", ["Bitcoin & Open Blockchain Store"])]),
    h("div.row", { key: 2 }, [
      h("div.col", { key: 1, onclick: toCart }, ["view cart"]),
      h("div.col", { key: 2, onclick: toPayment }, ["checkout"])
    ]),
    h("div.row", { key: 3 }, state.products.map(renderProduct))
  ]);
}

function renderProduct(p: Product): VNode {
  const sel: Selection = {
    product: p,
    quantity: 0,
    size: null
  };
  return h("div.container", { key: p.id }, [
    h("div.row", { key: 1 }, [p.caption]), // caption
    h("div.row", { key: 2 }, [h("img", { src: `assets/${p.id}.png` })]), // image
    sizes(sel), // sizes
    quantity(sel), // quantity
    h("div.row", { key: 5, onclick: addToCart(sel) }, ["Add to cart"])
  ]);
}

// Simple size selector
function sizes(sel: Selection): VNode {
  function f(s: Size): (e: MouseEvent) => void {
    return e => {
      sel.size = s;
      projector.scheduleRender();
    };
  }
  return h(
    "div.row",
    { key: 3 },
    (["S", "M", "L"] as Size[]).map(s => {
      return h(
        "div.col-sm.button",
        { key: s, onclick: f(s), classes: { selected: s == sel.size } },
        [s]
      );
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
  return h("div.row", { key: 4 }, [
    h("div.col-sm", { key: 1, onclick: down }, ["(-)"]),
    h("div.col-sm", { key: 2 }, [sel.quantity.toString()]),
    h("div.col-sm", { key: 3, onclick: up }, ["(+)"])
  ]);
}

// Shopping cart
function cart(): VNode {
  let total = 0;
  const rows = state.selections.map(s => {
    total += s.quantity * s.product.price;
    return h("div.row", { key: s.product.id }, [
      cols([
        s.product.caption,
        s.size as string,
        s.quantity.toString(),
        (s.quantity * s.product.price).toString()
      ])
    ]);
  });
  return h("div.container", [
    h("div.row", { key: 1 }, ["Shopping cart"]),
    h("div.row", { key: 2 }, cols(["Desc", "Size", "Quantity", "Price"])),
    rows.length > 0 ? rows : "No items",
    h("div.row", { key: 3 }, ["Total: " + total.toString()])
  ]);
}

// Payment page
function payment(): VNode {
  const f = (ev: MouseEvent) => {
    const order = {
      __type: "Order",
      data: state.selections
    } as Order;
    ws.send(JSON.stringify(order));
  };
  return h("div.container", [
    h("div.row", { key: 1 }, ["Pay with a credit card..."]),
    h("div.row", { key: 2 }, [h("div.button", { onclick: f }, ["GO!"])])
  ]);
}

// Confirmation
function confirmation(): VNode {
  const f = (ev: MouseEvent) => {
    state.selections = [];
    state.page = "store";
    projector.scheduleRender();
  };
  const rows = state.selections.map(s =>
    h(
      "div.row",
      { key: s.product.id },
      cols([s.product.caption, s.size as string, s.quantity.toString()])
    )
  );
  return h("div.container", [
    h("div.row", { key: 1 }, ["Success!"]),
    rows,
    h("div.row", { key: 2, onclick: f }, ["OK"])
  ]);
}

/* HELPERS */

function cols(xs: string[]): VNode[] {
  return xs.map(x => h("div.col-sm", { key: x.toString() }, [x]));
}

projector.append(document.body, render);
