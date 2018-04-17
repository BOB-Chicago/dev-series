-- Modify the database to support BTC payments

CREATE TABLE bitcoinPayments
(
  orderId TEXT,
  addressPath TEXT,
  amount INTEGER,
  txHash TEXT
)
