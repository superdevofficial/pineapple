const path = require('path');
const webpack = require('webpack');
const MinifyPlugin = require("babel-minify-webpack-plugin");

module.exports = ( nani, args ) => {
  return {
    target: 'node',
    entry: './src/pineapple.js',
    output: {
      filename: 'pineapple.js',
      path: path.resolve(__dirname, 'build')
    },
    module: {
      rules: [
        {
          test: /\.twig$/,
          use: {
            loader: 'twig-loader',
          }
        }
      ]
    },
    resolve: {
      extensions: [ '.js', '.twig' ]
    },
    plugins: [
      new MinifyPlugin()
    ]
  };
}