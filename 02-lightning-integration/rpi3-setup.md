---
title: Setting up a Raspberry Pi lightning node
author: Hannah Rosenberg
---

Intro
--


Pis are awesome, the Lightning network is awesome! So what could be cooler
than combining them? While I’m delighted with my Pi lightning node, it
wasn’t easy getting here. If you have a perfectly good Ubuntu machine
sitting around you may want to set this up there instead. However, if you
are as stubborn as me and determined make your pi do some awesome, then
continue!

There are all kinds of things that can go wrong, I encountered many, many
ways for things to go wrong, most of which I’ll note below. It will take
some time to get a pi lightning node up and running. I encourage you to
read this tutorial all the way through before starting, and maybe even read
a few of the other tutorials, video’s, and resources that we linked to at
the bottom.

I set my pi up with **bitcoind** and **lnd**.

### Things you’ll need:

- Raspberry Pi with a good charger (I’m using Pi 3 Model B with 64GB SD card)
- USB keyboard
- USB mouse
- Monitor (with an HDMI connection)
- A wifi connection with a router that you can access.
- External hard drive
- Lot’s of outlets to plug all your things into so you won’t get in trouble for 
	unplugging your spouses beer fridge.
- And lastly, patience. This is brand new tech, it’s a bit buggy and this is 
	not likely to be a smooth process.

_Note: I’m using an externally powered, 3TB Seagate Expansion drive. This is
much more heavy duty than what is needed. However, I ran into some trouble
getting enough power to my Pi to run a simple USB external drive, so this
was simpler for me._

### Assumptions:

- I’m assuming that you have somewhat of a technical background and are 
	comfortable with a linux command line.
- You know some basic networking, port forwarding, etc.
- I’m also assuming that your Raspberry Pi is up and running on Raspbian or a 
	debian based Linux.

The (long) process:
--

**PSA:** Getting a Pi to sync with the blockchain can take a LONG time!
...like a good week. If you have an existing bitcoin node you can connect
LND to that node. You’ll need to setup your lnd config with the ip and port
of your existing node and likely you’ll need to do some port forwarding to
get the to talking to eachother. In this case you can skip down to the
installing LND section.

### Prep the pi

I’ll be working on my Pi mostly through SSH. First things first, we need to
enable [SSH on our Pi][1].

Note: After SSH is enabled, by default any computer on the same network as
a Raspbian Pi will be able to SSH in with `pi@[ipaddress]` and password
`raspberry`. You’ll want to update your password. If you plan to use this
node on mainnet, you’ll want to get serious about security and disable
password authentication and use key’s instead. [This post on setting up a
full note has lots of good ideas for more secure configuration.][2]

For security reasons we’ll set up a new user who will be running bitcoind
and lnd. I’m calling my user `bitcoin`.

```shell
$ adduser bitcoin
```

Set a decent password, etc.

If you want to give your user sudo access: 
```shell
$ echo "bitcoin ALL=(ALL:ALL) ALL" | sudo tee -a /etc/sudoers
```

Switch to your new user:
```shell
$ sudo su bitcoin 
```

Next format the external drive. I did this on my Ubuntu laptop.

- plug it in and look for it in the command line (e.g. `df -h`)
- note where the device is mounted.
- first unmount the device `sudo umount /dev/sdb2`
- Then reformat as NTFS, or whatever you like: `sudo mkfs.ntfs /dev/sdb2`

On my 3T drive this took a while!  As I reformatted as NTFS, I installed ntfs 
on my pi.
```shell
$ sudo apt-get install ntfs-3g
```

If all goes well you should be able to just plug it in, SSH in, run `lsblk`,
or `fdisk -l` and see the drive listed.


Note where it’s mounted and create a mount point. (You may need to unmount it 
first.)
```shell
$ mkdir data
$ sudo umount /dev/sda2
$ sudo mount /dev/sda2 /home/bitcoin/data
```

To ensure it stays mounted through reboots, you can edit `/etc/fstab`.
```shell
$ echo "/dev/sda2 /home/bitcoin/data ntfs-3g rw,default 0 0” | sudo tee -a /etc/fstab
```
Note that this drive will be mounted for the bitcoin user.  You can also use 
`sudo blkid` to get the UUID and use that instead of the
mount location.

Network stuff
--

I did all kinds of things to my router during this process. I wanted to be
able to `ssh` into my pi while working outside the home. (This isn’t very
secure. I would not recommend it for mainnet.)  You’ll want to give your pi 
fixed ip so that other nodes can stay connected to it.  Be sure to open and 
forward port `9735` (Lightning) on your router.  If you want to accept incoming 
Bitcoin node connections, open and forward `8333` as well.

Install bitcoind
--

Now on to installing `bitcoind`! You can of course use another bitcoin
implementation, but the below instructions are for bitcoind.

If your Pi isn’t new, you might want to updating things first...
```shell
$ sudo apt-get update
$ sudo apt-get upgrade
$ sudo apt-get dist-upgrade
$ sudo apt-get autoremove
```

**FYI:** If you’re running ubuntu installing bitcoind is quick and easy. [This
guide][3] will walk you though it. On Raspbian it’s a bit of a pain. We’ll walk 
though Raspbian based instructions below.

First up, get loads of dependencies...

Don’t play around with Raspbian’s ppa sources files too much or you might
find that raspbian will have a very hard time finding these packages.
```shell
$ sudo apt-get install \
  git build-essential autoconf \
	libssl-dev libboost-dev libboost-chrono-dev libboost-filesystem-dev \
	libboost-program-options-dev libboost-system-dev libboost-test-dev \
	libboost-thread-dev libtool libzmq3-dev libevent-dev libtool \
	libboost-all-dev libminiupnpc-dev qt4-dev-tools libprotobuf-dev \
	protobuf-compiler libqrencode-dev db4.8-util \
	-y
```

And then there is still more!  We need a specific version of BerkeleyDB.
```shell
$ wget http://download.oracle.com/berkeley-db/db-4.8.30.zip
$ unzip db-4.8.30.zip
$ cd db-4.8.30
$ cd build_unix
$ ../dist/configure --prefix=/usr/local --enable-cxx
$ make
$ sudo make install
$ cd ~
```

And now to actually install bitcoind. There are a few ways to do this. You can 
cloning the repo and build it yourself, or just download and verify the binary 
(which is also much faster!). Those instructions will follow these.

### repo version...

First lets have a look at [the repo][4] and see what the latest version is. As 
I’m typing this it’s 0.16, so I’ll clone that branch.
```shell
$ git clone -b 0.16 https://github.com/bitcoin/bitcoin.git
$ cd bitcoin/
$ ./autogen.sh
$ ./configure
$ make
$ sudo make install
```

That last command is going to take a while, as in hours.

### Binary version...

```shell
$ cd Downloads
$ wget https://bitcoin.org/bin/bitcoin-core-0.16.0/bitcoin-0.16.0-arm-linux-gnueabihf.tar.gz
$ wget https://bitcoin.org/bin/bitcoin-core-0.16.0/SHA256SUMS.asc
$ wget https://bitcoin.org/laanwj-releases.asc
$ sha256sum --check SHA256SUMS.asc --ignore-missing
```
In the output you should see
```
"bitcoin-0.16.0-arm-linux-gnueabihf.tar.gz: OK"
```
Verify the signature:
```shell
$ gpg ./laanwj-releases.asc
```
Hopefully you’ll get `01EA5486DE18A882D4C2684590C8019E36C2E964`
```shell
$ gpg --import ./laanwj-releases.asc$ gpg --verify SHA256SUMS.asc
Good signature from Wladimir ...
... 01EA 5486 DE18 A882 D4C2  6845 90C8 019E 36C2 E964
```

Next, extract and install. (You’ll want to do this as your new bitcoin
user.)
```shell
$ tar -xvf bitcoin-0.16.0-arm-linux-gnueabihf.tar.gz
$ sudo install -m 0755 -o root -g root -t /usr/local/bin bitcoin-0.16.0/bin/*
```

Check that it’s working with `bitcoind --version`.  If you see “Bitcoin Core 
Daemon version v0.16.0” you’re in business!

Now let’s create a directory on our external drive for our testnet data.

```shell
$ cd data
$ mkdir bitcoin_testnet
```

Then we’ll create a symlink from the bitcoin data directory to our 
`bitcoin_testnet` directory.

```shell
$ ln -s /home/bitcoin/data/bitcoin_testnet /home/bitcoin/.bitcoin
```

Now comes the fun part! Let’s configure bitcoind!

Configure bitcoind
--

In `/home/bitcoin/.bitcoin`
```shell
$ touch bitcoin.conf
```

[This is a good place][5] to get an overview of what options there are in the
config file. Also Blockchain developer Jameson Lopp has a [bitcoind config generator][6].


Below I’ll walk through the options I chose for my node…
```toml
# bitcoind configuration file
# We'll be running this on the test network
testnet=1

# Show the love
uacomment=BOBChicago

# Publish rawtx
zmqpubrawtx=tcp://127.0.0.1:6164

# Index transactions
txindex=1

# Set up RPC
server=1
rpcuser=user
rpcpassword=pass

# Configure these according to your needs
rpcbind=127.0.0.1 
rpcport=6163

# Raspberry Pi optimizations
dbcache=100
maxorphantx=10
maxmempool=50
maxconnections=40
maxuploadtarget=5000
```

Now let’s try to set bitcoind up to run in the background. …or just start
it up with this command…
```shell
$ bitcoind –daemon -server
```


Let’s exit the bitcoin user.
```shell
$ exit
```

and create a systemd unit to control the service.
```shell
$ sudo nano /etc/systemd/system/bitcoind.service
```

Add the below to that file and save…
```
[Unit]
Description=Bitcoin daemon
After=network.target

[Service]
User=bitcoin
Group=bitcoin
Type=simple
ExecStart=/usr/local/bin/bitcoind

[Install]
WantedBy=multi-user.target
```

Then enable the service and restart your pi.
```shell
$ sudo systemctl enable bitcoind.service
$ sudo shutdown -r now
```

Wait a min and then reconnect to your pi and check that the service has
started and that the testnet blockchain is being downloaded.  And check the 
status of the service with
```shell
$ systemctl status bitcoind.service
```

Now we can use the bitcoind command line tool to get some info about the
blockchain.
```shell
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 getblockchaininfo
```

If you see this message…
```
error code: -28
error message:
Loading block index…
```

You’re Pi is still syncing with the blockchain...wait a week!


Once you can get a response from `getblockchaininfo`, you’ll still need to
wait until `verificationprogress` is at least, 0.9999xxxx before you can
use `bitcoind`. ...waiting, this involves lots and lots of waiting.

_Note: I ran into an issue where the pi would crash while syncing. I had
to make sure that my pi optimizations were turned on in the config file and
I turned dbcache down to 64 to prevent the crashes._

If you run into problems [here is a list of error codes][7].


To watch bitcoind run or to check for errors...
```shell
$ tail -f /home/bitcoin/.bitcoin/testnet3/debug.log
```

If you are looking to explore, [here is a list of bitcoin-cli commands][8].


Now that bitcoind is up and running and you can get a response from
`bitcoin-cli`, let’s play with it a bit. We’ll need to setup a wallet, etc.  
Let’s checkout the details of the wallet created by `bitcoind`.
```shell
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 getwalletinfo
```

If we are running on mainnet, we’ll want to encrypt.
```
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 encryptwallet
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 walletpassphrase
```

Know how to backup and restore
```shell
$ bitcoin-cli backupwallet /mnt/usb-vault/wallet_testnet.backup
$ bitcoin-cli importwallet /mnt/usb-vault/wallet_testnet.backup
```

Let’s go get some testnet coins. We’ll need an address for that…
```shell
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 getnewaddress
```

Copy the output and paste it [here][9].  If the address you generated didn’t 
start with a 2, it’s might not be a witness address. Testnet SegWit address 
start with a 2. To make it one...
```shell
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 addwitnessaddress
[your address]
```

Then transfer your funds there.
```shell
$ bitcoin-cli -rpcuser=user -rpcpassword=pass -rpcport=6163 sendtoaddress [New
Address from above output]
```

And now finally, it’s time to set up LND!

Install LND
--

You can follow along with [the official install instructions here][10], or use
a binary as shown below.

At the moment `v0.4.2-beta` is the latest.
```shell
$ wget https://github.com/lightningnetwork/lnd/releases/download/v0.4.2-beta/lnd-linux-arm-v0.4.2-beta.tar.gz
$ tar zxf lnd-linux-arm-v0.4.2-beta.tar.gz
$ cd lnd-linux-arm-v0.4.2-beta/
```

If we have an ‘lnd’ directory then we should be good. Copy `lnd` and
`lncli` to `/usr/bin` to make life easier and let’s start it up.
```shell
$ lnd --bitcoin.active --bitcoin.testnet \
  --debuglevel=debug --bitcoin.node=bitcoind --bitcoind.rpcuser=user \
  --bitcoind.rpcpass=pass --bitcoind.zmqpath=tcp://127.0.0.1:6163 \
  --alias=SomeAmusingName
```

After you start LND you should see the `.lnd` directory in your user’s home
directory.

### Configure lnd

You can create a `lnd.conf` file there. Here is an example of what you might
put there…
```toml
[Bitcoin]
bitcoin.active=1
bitcoin.testnet=1
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpchost=localhost:6163
bitcoind.rpcuser=user
bitcoind.rpcpass=pass
bitcoind.zmqpath=tcp://localhost:6164
```

When you start up LND you’ll want to let it run in one terminal window, and
open another to enter commands. Type `lncli` to get a list of LND commands.


Let’s create a wallet, and enter a password (8+ characters) for it, and
write down your seed!
```shell
$ lncli create
$ lncli unlock
```

Note your public key, find it with `lncli getinfo`.


_Note:_ I ran into another error here, `[lncli] rpc error: code =
Unavailable desc = grpc: the connection is unavailable`. In my case this
meant that I had somehow messed up the bitcoind config such that bitcoind
was not serving zmq on port 6164 as lnd was expecting it to. Commands
such as `nc -vz` or `netstat -a | more` can help you sort out if that’s
what’s happening to you.

_Note:_ Even after lnd is up and running it will need time to read the
blockchain from bitcoind. As with most things on the pi, this will take
some time. Watch the output from the terminal where you started up `lnd`. It
should be updating you on the syncing progress.

Now we need an address.
```shell
$ lncli newaddress np2wkh
```

Visit a faucet and get some $$$

- https://faucet.lightning.community/
- https://testnet.coinfaucet.eu/en/

But before we can do that we’ll need to connect to these faucet nodes and
open a channel with them.

You’ll need some peers. Check how many you’ve got.
```shell
$ lncli listpeers
```

We need to connect to other nodes. You’ll need the public key, ip address
and port of a node that you would like to connect to.

```shell
$ lncli connect [pubkey]@[ip]:[port]
```

You can run the `listpeers` command again to see that it was successful.

Once your transactions have confirmed you can run
```shell
$ lncli walletbalance
```

_Note: amounts are displayed in Satoshis._

Once we are connected and have a balance, we can open a channel.
```shell
$ lncli openchannel \
    --node_key=[pubkey] \
		--local_amt=[number of satoshis to lockup in channel]
```

The output of that command should be the funding transaction id. LND
requires 3 confirmations.  With Lightning payments you need to create an 
invoice prior to getting paid. To receive funds from one of your channels, 
first create an invoice.

```shell
$ lncli addinvoice --amt=10001
```

The output should include a `pay_req` string. If you are attempting to send
a payment to another node, you will first need this payment request. Once
you have it, you can pay with the `sendpayment` command.
```shell
$ lncli sendpayment --pay_req=[big long string]
```

You should receive a confirmation.  So there you go, you’re using the Lightning 
Network!!! You can look for your node on [this testnet explorer][11].

Here are some other lncli commands that you should play around with a bit…

```shell
$ lncli listchannels
$ lncli getnetworkinfo
$ lncli channelbalance
$ lncli lookupinvoice
```

If you run across issues that we haven’t covered here, we’d recommend
checking out these guides as well...

- https://medium.com/@stadicus/noobs-guide-to-%EF%B8%8F-lightning%EF%B8%8F-on-a-raspberry-pi-f0ab7525586e
- https://brettmorrison.com/running-a-bitcoin-lightning-full-node-on-raspberry-pi
- Cool YouTube video example: https://www.youtube.com/watch?v=DLWkOqo0Tak

And [here is an epic collection][12] of lightning resources!

[1]: https://www.raspberrypi.org/documentation/remote-access/ssh/
[2]: https://medium.com/@meeDamian/bitcoin-full-node-on-rbp3-95314e828704
[3]: https://bitcoin.org/en/full-node#ubuntu-1604
[4]: https://github.com/bitcoin/bitcoin/branches
[5]: https://github.com/bitcoin/bitcoin/blob/master/contrib/debian/examples/bitcoin.conf
[6]: https://jlopp.github.io/bitcoin-core-config-generator/
[7]: https://github.com/bitcoin/bitcoin/blob/v0.15.0.1/src/rpc/protocol.h#L32L87
[8]: https://en.bitcoin.it/wiki/Running_Bitcoin
[9]: https://testnet.manu.backend.hamburg/faucet
[10]: https://github.com/lightningnetwork/lnd/blob/master/docs/INSTALL.md
[11]: https://explorer.acinq.co/
[12]: https://lnroute.com/
