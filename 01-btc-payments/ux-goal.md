UX Goal
==

What if a user wants to pay with a digital currency?
--

There are pretty much two options.  We could either ...

- ... use a payment provider who will accept a variety of digital currencies,
  and credit either US dollars or digital currency to our account.
- ... set ourselves up to accept digital currencies. 

The first service is really a lot of little services rolled into one.  We will
focus on BTC here.  To quote the customer a price for their order in BTC, we
have to have access to some notion of the spot price for BTC.  The price of the
t-shirt changes infrequently, but the exchange rate dollars-BTC fluctuates all
the time.  Ownership of BTC is tied to knowledge of a secret number.  We will
need to have a strategy for both protecting these secrets and also making it
possible to cheaply generate new payment addresses.  Every order should have a
unique payment address.  

Back to the user experience.  When the user clicks to pay with BTC, they should
immediately be presented with a QR code and payment URI (which includes the
amount and a descriptive message).  To make their life easier, we can have a
button which copies the payment URI to their clipboard.  

When the user pays, their wallet will generate a transaction and sign it with
one of their cryptographic keys.  Then it will broadcast the transaction to its
connected peers, who will forward it to their peers, and so on.   Eventually,
the transaction will become known to most if not all of the miners and will
probably be included in a block at some point.  There is no need for this
process to finish before we give the user some feedback.

Once we see the transaction in our node's mempool, we can inform the user that
the order is being processed.  Ordinarily, the next communication to the user
will be to let them know their order has shipped.  However, it may be the case
that their transaction is not included in a block or that there are not enough
confirmation blocks after a certain threshold has passed.

This is a sticky UX point and we have two options.  We can either suggest that
they spend the funds to a new address so that the payment will be invalid if it
does get mined; or we can publish a refund transaction.  In this demo, we are
simply going to send the user an explanatory note. 
