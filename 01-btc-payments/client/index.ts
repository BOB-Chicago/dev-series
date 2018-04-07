// Client side functionality

import { Projector, VNode, createProjector, h } from "maquette";
import { Product, Message, Selection, Size, Order } from "../lib";

/* DATA */

type Page = "welcome" | "store" | "cart" | "payment" | "confirmation";

type State = {
  cart: Map<string, Selection>;
  page: Page;
  products: Product[];
  selections: Map<string, Selection>;
};

type EventT =
  | Load
  | Goto
  | CartAdd
  | SizeClick
  | QuantityClick
  | SubmitOrder
  | ConfirmOk;

interface Load {
  __ctor: "Load";
  products: Product[];
}

interface Goto {
  __ctor: "Goto";
  page: Page;
}

interface CartAdd {
  __ctor: "CartAdd";
  product: string;
}

interface SizeClick {
  __ctor: "SizeClick";
  product: string;
  size: Size;
}

interface QuantityClick {
  __ctor: "QuantityClick";
  product: string;
  action: "up" | "down";
}

interface SubmitOrder {
  __ctor: "SubmitOrder";
}

interface ConfirmOk {
  __ctor: "ConfirmOk";
}

let state: State = {
  cart: new Map(),
  page: "welcome",
  products: [],
  selections: new Map()
};

/* WEBSOCKET */

const ws: WebSocket = new WebSocket("ws://localhost:8081");
const projector: Projector = createProjector();

ws.addEventListener("message", (e: MessageEvent) => {
  const msg = JSON.parse(e.data) as Message;
  switch (msg.__ctor) {
    case "Products": {
      event({
        __ctor: "Load",
        products: msg.data
      });
      break;
    }
    case "Confirmation": {
      event({
        __ctor: "Goto",
        page: "confirmation"
      });
    }
  }
  projector.scheduleRender();
});

/* STEPPER */

function step(ev: EventT, s0: State): State {
  switch (ev.__ctor) {
    case "Goto": {
      s0.page = ev.page;
      return s0;
    }
    case "Load": {
      s0.products = ev.products;
      s0.page = "store";
      return s0;
    }
    case "CartAdd": {
      return s0;
    }
    case "QuantityClick": {
      return s0;
    }
    case "SizeClick": {
      return s0;
    }
    case "SubmitOrder": {
      const ss = [] as Selection[];
      s0.cart.forEach(s => ss.push(s));
      const order = {
        __ctor: "Order",
        data: ss
      } as Order;
      ws.send(JSON.stringify(order));
      return s0;
    }
    case "ConfirmOk": {
      s0.page = "store";
      s0.cart = new Map();
      s0.selections = new Map();
      return s0;
    }
  }
}

function event(ev: EventT): void {
  state = step(ev, state);
  projector.scheduleRender();
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
    event({
      __ctor: "Goto",
      page: "cart"
    });
  };
  const toPayment = (ev: MouseEvent) => {
    event({
      __ctor: "Goto",
      page: "payment"
    });
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
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "CartAdd",
      product: p.id
    });
  };
  return h("div.container", { key: p.id }, [
    h("div.row", { key: 1 }, [p.caption]), // caption
    h("div.row", { key: 2 }, [h("img", { src: `assets/${p.id}.png` })]), // image
    sizes(p.id), // sizes
    quantity(p.id), // quantity
    h("div.row", { key: 5, onclick: f }, ["Add to cart"])
  ]);
}

// Simple size selector
function sizes(pid: string): VNode {
  function f(s: Size): (e: MouseEvent) => void {
    return e => {
      event({
        __ctor: "SizeClick",
        product: pid,
        size: s
      });
    };
  }
  return h(
    "div.row",
    { key: 3 },
    (["S", "M", "L"] as Size[]).map(s => {
      const isSelected =
        state.selections.has(pid) &&
        (state.selections.get(pid) as Selection).size === s;
      return h(
        "div.col-sm.button",
        { key: s, onclick: f(s), classes: { selected: isSelected } },
        [s]
      );
    })
  );
}

// Simple quantity updater: "(-) q (+)"
function quantity(pid: string): VNode {
  const up = (ev: MouseEvent) => {
    event({
      __ctor: "QuantityClick",
      product: pid,
      action: "up"
    });
  };
  const down = (ev: MouseEvent) => {
    event({
      __ctor: "QuantityClick",
      product: pid,
      action: "down"
    });
  };
  const q = state.selections.has(pid)
    ? (state.selections.get(pid) as Selection).quantity
    : 0;
  return h("div.row", { key: 4 }, [
    h("div.col-sm", { key: 1, onclick: down }, ["(-)"]),
    h("div.col-sm", { key: 2 }, [q.toString()]),
    h("div.col-sm", { key: 3, onclick: up }, ["(+)"])
  ]);
}

// Shopping cart
function cart(): VNode {
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "Goto",
      page: "store"
    });
  };
  let total = 0;
  const rows = [] as VNode[];
  state.selections.forEach(s => {
    total += s.quantity * s.product.price;
    rows.push(
      h("div.row", { key: s.product.id }, [
        cols([
          s.product.caption,
          s.size as string,
          s.quantity.toString(),
          (s.quantity * s.product.price).toString()
        ])
      ])
    );
  });
  return h("div.container", [
    h("div.row", { key: 1 }, ["Shopping cart"]),
    h("div.row", { key: 2 }, cols(["Desc", "Size", "Quantity", "Price"])),
    rows.length > 0 ? rows : "No items",
    h("div.row", { key: 3 }, ["Total: " + total.toString()]),
    h("div.row", { key: 4, onclick: f }, ["Continue shopping"])
  ]);
}

// Payment page
function payment(): VNode {
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "SubmitOrder"
    });
  };
  return h("div.container", [
    h("div.row", { key: 1 }, ["Pay with a credit card..."]),
    h("div.row", { key: 2 }, [h("div.button", { onclick: f }, ["GO!"])])
  ]);
}

// Confirmation
function confirmation(): VNode {
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "ConfirmOk"
    });
  };
  const rows = [] as VNode[];
  state.selections.forEach(s =>
    rows.push(
      h(
        "div.row",
        { key: s.product.id },
        cols([s.product.caption, s.size as string, s.quantity.toString()])
      )
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
