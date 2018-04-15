# DATABASE STRUCTURE
# 
# order_contents
# btc_payment
# catalog

CREATE TABLE catalog (id INTEGER, unit_price INTEGER, description TEXT);

CREATE TYPE payment_type AS ENUM ( 'bitcoin', 'credit' );

CREATE TABLE orders (id INTEGER, payment_type payment_type);

CREATE TABLE btc_payments (order_id INTEGER, address CHAR(40), amount INTEGER);
