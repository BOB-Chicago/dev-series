const checkerConfig = {
  devtool: "inline-source-map",
  entry: {
    client: "./server/Confirm.ts",
  },
  mode: "development",
  output: {
    path: __dirname + "/build",
    filename: "checker.js"
  },
  resolve: {
    extensions: [".ts", ".js" ]
  },
  module: {
    rules: [
      { 
        test: /\.ts$/,
        loader: "ts-loader"
      }
    ]
  },
  target: "node"
}

const clientConfig = {
  devtool: "inline-source-map",
  entry: {
    client: "./client/index.ts",
  },
  mode: "development",
  output: {
    path: __dirname + "/build",
    filename: "client.js"
  },
  resolve: {
    extensions: [".ts", ".js" ]
  },
  module: {
    rules: [
      { 
        test: /\.ts$/,
        loader: "ts-loader"
      }
    ]
  },
  target: "web"
}

const walletConfig = {
  devtool: "inline-source-map",
  entry: {
    client: "./wallet/index.ts",
  },
  mode: "development",
  output: {
    path: __dirname + "/build",
    filename: "wallet.js"
  },
  resolve: {
    extensions: [".ts", ".js" ]
  },
  module: {
    rules: [
      { 
        test: /\.ts$/,
        loader: "ts-loader"
      }
    ]
  },
  target: "node"
}

module.exports = [ checkerConfig, clientConfig, walletConfig ];
