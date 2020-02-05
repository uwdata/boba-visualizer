'use strict'

import Store from './store'
import Vue from 'vue'
import Util from './util'

const DEBUG = process.env.NODE_ENV === 'development'

// print only if we are in dev build
function log_debug (...args) {
  if (DEBUG) {
    console.log(...args)
  }
}

// shared utilities
let util = new Util()

// shared store
let store = new Store()

// global event bus
let bus = new Vue()

// color
let tableau10 = '4c78a8f58518e4575672b7b254a24beeca3bb279a2ff9da69d755dbab0ac'

// default config
const default_config = {
  'dataset': 'multiverse',
  'agg_plot': {
    'x_axis_label': 'Effect Size'
  },
  'raw_plot': {
    'x_axis_label': ''
  }
}

export {
  log_debug,
  store,
  bus,
  util,
  tableau10,
  default_config
}
