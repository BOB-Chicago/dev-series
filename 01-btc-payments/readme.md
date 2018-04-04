Add Bitcoin payments to your T-shirt store
==

Overview
--

The goal of this workshop is to introduce working developers to some of the
foundational concepts in Bitcoin by adding BTC payment functionality to a model
ecommerce site.  We will cover client and server side integrations and a simple
wallet management strategy.  While you would probably want to make different
choices for your stack in your own project, the ideas we will cover are
portable to all cryptocurrencies.  We will assume a working knowledge of
JavaScript, nodejs, and the linux operating system.  In particular, you should
be very comfortable working in a shell.

Script
--

- Walk through example T-shirt store
- Explain UX goal
- Generate HD wallet
- Set up fully validating node
- Patch client application
  * Request and display BTC payment address
	* Handle push notification of payment in mempool
- Patch server application
  * Generate addresses
	* Monitor mempool
- Wallet organization

Concepts
--

- Public-private key pair
- BTC addresses
- HD wallets
- Hot & cold storage
- node validation: full vs. spv
- mempool 
