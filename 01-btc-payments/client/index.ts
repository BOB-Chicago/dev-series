// Client side functionality

import { Projector, VNode, createProjector, h } from "maquette";
import * as qrcode from "qrcode-generator";
import {
  PaymentMethod,
  Product,
  Message,
  Selection,
  Size,
  Order
} from "../lib";
import { App, Blank, Checkout, EventT, Page, State } from "./Model";

/* INIT 
 *
 * We start on the welcome page with an empty cart, empty catalog, and nothing 
 * selected.
 *
 */

let state: State = {
  __ctor: "Blank",
  page: "welcome"
} as Blank;

/* WEBSOCKET 
 *
 * Communication with the server is handled by a websocket.  When we connect, 
 * the server sends us the current catalog.  When we send an order, the server 
 * sends back a confirmation with the order id.
 *
 */

const ws: WebSocket = new WebSocket("ws://localhost:8081");
const projector: Projector = createProjector();

ws.addEventListener("message", (e: MessageEvent) => {
  const msg = JSON.parse(e.data) as Message;
  switch (msg.__ctor) {
    case "PaymentDetails": {
      event({
        __ctor: "PaymentDetails",
        address: msg.address,
        amount: msg.amount
      });
      break;
    }
    case "Products": {
      event({
        __ctor: "Load",
        products: new Map(msg.data.map(p => [p.id, p] as [string, Product]))
      });
      break;
    }
    case "Confirmation": {
      event({
        __ctor: "GotOrderId",
        orderId: msg.orderId
      });
    }
  }
  projector.scheduleRender();
});

/* STEPPER 
 *
 * This function updates the program state for each event.
 *
 */
function step(ev: EventT, s0: State): State {
  switch (ev.__ctor) {
    case "Checkout": {
      console.log("CHECKOUT");
      s0 = {
        __ctor: "Checkout",
        cart: (s0 as App).cart,
        page: "checkout",
        paymentMethod: PaymentMethod.Credit,
        products: (s0 as App).products,
        streetAddress: ""
      } as Checkout;
      break;
    }
    case "Load": {
      console.log("LOAD");
      s0 = {
        __ctor: "Shopping",
        cart: new Map(),
        page: "store",
        products: ev.products,
        selections: new Map()
      };
      break;
    }
    case "CartAdd": {
      console.log("CARTADD");
      if (s0.__ctor === "Shopping") {
        const sel = s0.selections.get(ev.product) as Selection;
        const cartKey = ev.product + ":" + sel.size;
        if (s0.cart.has(cartKey)) {
          (s0.cart.get(cartKey) as Selection).quantity += sel.quantity;
        } else {
          s0.cart.set(cartKey, { ...sel });
        }
        s0.selections.delete(ev.product);
      }
      break;
    }
    case "ConfirmOk": {
      console.log("CONFIRMOK");
      s0 = {
        __ctor: "Shopping",
        cart: new Map(),
        page: "store",
        products: (s0 as App).products,
        selections: new Map()
      };
      break;
    }
    case "Goto": {
      console.log("GOTO", ev.page);
      s0.page = ev.page;
      break;
    }
    case "GotOrderId": {
      console.log("GOTORDERID");
      s0 = {
        __ctor: "OrderSummary",
        cart: (s0 as App).cart,
        orderId: ev.orderId,
        page: "confirmation",
        products: (s0 as App).products
      };
      break;
    }
    case "QuantityClick": {
      console.log("QUANTITYCLICK");
      if (s0.__ctor === "Shopping" && s0.selections.has(ev.product)) {
        const sel = s0.selections.get(ev.product) as Selection;
        switch (ev.action) {
          case "up": {
            sel.quantity += 1;
            break;
          }
          case "down": {
            sel.quantity = Math.max(0, sel.quantity - 1);
          }
        }
      }
      break;
    }
    case "PaymentDetails": {
      console.log("PAYMENTDETAILS");
      s0 = {
        __ctor: "BitcoinPayment",
        amount: ev.amount,
        bitcoinAddress: ev.address,
        cart: (s0 as App).cart,
        page: "payment",
        products: (s0 as App).products
      };
      break;
    }
    case "UpdateDetails": {
      console.log("UPDATEDETAILS");
      if (s0.__ctor == "Checkout") {
        s0.streetAddress = ev.streetAddress;
      }
      break;
    }
    case "SizeClick": {
      console.log("SIZECLICK");
      if (s0.__ctor === "Shopping") {
        if (!s0.selections.has(ev.product)) {
          s0.selections.set(ev.product, {
            product: s0.products.get(ev.product) as Product,
            quantity: 1,
            size: ev.size
          });
        } else {
          (s0.selections.get(ev.product) as Selection).size = ev.size;
        }
      }
      break;
    }
    case "SubmitOrder": {
      console.log("SUBMITORDER");
      const ss = Array.from((s0 as Checkout).cart.values()) as Selection[];
      const order = {
        __ctor: "Order",
        paymentMethod: (s0 as Checkout).paymentMethod,
        selections: ss,
        streetAddress: (s0 as Checkout).streetAddress
      } as Order;
      ws.send(JSON.stringify(order));
    }
  }
  return s0;
}

function event(ev: EventT): void {
  state = step(ev, state);
  projector.scheduleRender();
}

/* VIEWS */

function render(): VNode {
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
    case "checkout": {
      return checkout();
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
  const ps = [] as VNode[];
  if (state.__ctor === "Shopping") {
    const sels = state.selections;
    state.products.forEach(p => {
      ps.push(renderProduct(p, sels));
    });
    let cartSize = 0;
    state.cart.forEach(s => (cartSize += s.quantity));
    return h("div.container", [
      h("div.row", { key: 1 }, [h("h1", ["Bitcoin & Open Blockchain Store"])]),
      h("div.row.nav", { key: 2 }, [
        h("div.col", { key: 1, onclick: gotoPage("cart") }, [
          `View cart (${cartSize})`
        ])
      ]),
      h("div.row", { key: 3 }, ps)
    ]);
  } else {
    return error();
  }
}

function renderProduct(p: Product, selections: Map<string, Selection>): VNode {
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "CartAdd",
      product: p.id
    });
  };
  const children = [
    h("div.row", { key: "caption" }, [p.caption]), // caption
    h("div.row", { key: "image" }, [h("img", { src: `${p.id}.svg` })]), // image
    h("div.row", { key: "price" }, ["$" + dollars(p.price).toString()]), // price
    sizes(p.id, selections), // sizes
    quantity(p.id, selections) // quantity
  ];
  if (selectionComplete(p.id, selections)) {
    children.push(h("div.row", { key: "add", onclick: f }, ["Add to cart"]));
  }
  return h("div.product", { key: p.id }, [h("div.container", children)]);
}

// Simple size selector
function sizes(pid: string, selections: Map<string, Selection>): VNode {
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
    { key: "sizes" },
    (["S", "M", "L"] as Size[]).map(s => {
      const isSelected =
        selections.has(pid) && (selections.get(pid) as Selection).size === s;
      return h(
        "div.col-sm",
        { key: s, onclick: f(s), classes: { selected: isSelected } },
        [s]
      );
    })
  );
}

// Simple quantity updater: "(-) q (+)"
function quantity(pid: string, selections: Map<string, Selection>): VNode {
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
  const q = selections.has(pid)
    ? (selections.get(pid) as Selection).quantity
    : 0;
  return h("div.row", { key: "quantity" }, [
    h("div.col-sm", { key: 1, onclick: down }, ["(-)"]),
    h("div.col-sm", { key: 2 }, [q.toString()]),
    h("div.col-sm", { key: 3, onclick: up }, ["(+)"])
  ]);
}

// Shopping cart
function cart(): VNode {
  if (state.__ctor === "Shopping") {
    let total = 0;
    const rows = [] as VNode[];
    state.cart.forEach(s => {
      total += s.quantity * s.product.price;
      rows.push(
        h("div.row", { key: s.product.id }, [
          cols([
            s.product.caption,
            s.size as string,
            s.quantity.toString(),
            dollars(s.quantity * s.product.price).toString()
          ])
        ])
      );
    });
    const items = [
      h("div.row", { key: 1 }, [h("h1", ["Shopping cart"])]),
      h("div.row", { key: 2 }, cols(["Desc", "Size", "Quantity", "Price"])),
      rows.length > 0 ? rows : "No items",
      h("div.row", { key: 3 }, ["Total: $" + dollars(total).toString()]),
      h("div.row", { key: 4, onclick: gotoPage("store") }, [
        "Continue shopping"
      ])
    ];
    if (state.cart.size > 0) {
      items.push(
        h("div.row", { key: 5, onclick: gotoPage("checkout") }, ["Checkout"])
      );
    }
    return h("div.container", items);
  } else {
    return error();
  }
}

// Gather user details
function checkout(): VNode {
  const card = () =>
    event({
      __ctor: "SubmitOrder",
      paymentMethod: PaymentMethod.Credit
    });
  const bitcoin = () =>
    event({
      __ctor: "SubmitOrder",
      paymentMethod: PaymentMethod.Bitcoin
    });
  const f = (e: MouseEvent) =>
    event({
      __ctor: "UpdateDetails",
      streetAddress: (e.target as any).value
    });
  return h("div.container", [
    h("div.row", { key: 1 }, [h("h1", ["Shipping address"])]),
    h("div.row", { key: 2 }, [h("input", { oninput: f }, [])]),
    h("div.row", { key: 3, onclick: card }, ["Pay with card"]),
    h("div.row", { key: 4, onclick: bitcoin }, ["Pay with bitcoin"])
  ]);
}

// BTC payment page
function payment(): VNode {
  if (state.__ctor === "BitcoinPayment") {
    const bitcoinURI = `bitcoin:${
      state.bitcoinAddress
    }?amount=${state.amount.toString()}&message=BOBChicago`;
    const qr = qrcode(0, "H");
    qr.addData(bitcoinURI);
    qr.make();
    return h("div.container", [
      h("div.row", { key: 1 }, [
        `Please send ${state.amount.toString()} BTC to ${
          state.bitcoinAddress
        } to complete your order.`
      ]),
      h("div.row", { key: 2, innerHTML: qr.createImgTag(5).toString() }, []),
      h("div.row", { key: 3 }, [h("a", { href: bitcoinURI }, [bitcoinURI])])
    ]);
  } else {
    return error();
  }
}

// Confirmation
function confirmation(): VNode {
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "ConfirmOk"
    });
  };
  if (state.__ctor === "OrderSummary") {
    const rows = [] as VNode[];
    state.cart.forEach(s =>
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
      h("div.row", { key: 2 }, [`Your order id is ${state.orderId}`]),
      rows,
      h("div.row", { key: 3 }, [h("div.button", { onclick: f }, ["OK"])])
    ]);
  } else {
    return error();
  }
}

// Errors
function error(): VNode {
  return h("div.container", h("h1.err", ["There is a problem."]));
}

/* HELPERS */

function cols(xs: string[]): VNode[] {
  return xs.map(x => h("div.col-sm", { key: x.toString() }, [x]));
}

function dollars(cs: number): number {
  return cs / 100;
}
function gotoPage(p: Page): (ev: MouseEvent) => void {
  const f = (ev: MouseEvent) => {
    event({
      __ctor: "Goto",
      page: p
    });
  };
  return f;
}

function selectionComplete(pid: string, ss: Map<string, Selection>): boolean {
  if (ss.has(pid)) {
    const sel = ss.get(pid) as Selection;
    return sel.size !== null && sel.quantity > 0;
  }
  return false;
}

// GO!
projector.append(document.body, render);
