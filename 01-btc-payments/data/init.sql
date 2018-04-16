--
-- Setup database for handling orders
--

-- Available items
CREATE TABLE catalog 
( 
  id TEXT, 
  caption TEXT,
  price INTEGER
);

CREATE TABLE orders 
( 
  id TEXT, 
  timestamp INTEGER, 
  paymentMethod INTEGER, 
  status INTEGER, 
  shippingAddress TEXT
);

CREATE TABLE purchases 
(
  orderId TEXT, 
  itemId TEXT,
  size INTEGER,
  quantity INTEGER
);

-- 
-- POPULATE catalog

INSERT INTO catalog VALUES ("tee-1", "Classic BOB Logo", 1800);
INSERT INTO catalog VALUES ("tee-2", "Verify Chicago", 1700);
