'use strict'
const merge = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: "development",
  watch: true,
  devtool: 'cheap-module-eval-source-map'
})
