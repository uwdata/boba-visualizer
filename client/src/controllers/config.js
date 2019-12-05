'use strict'

import Store from './store'
import Vue from 'vue'

const DEBUG = process.env.NODE_ENV === 'development'

// print only if we are in dev build
function log_debug (...args) {
  if (DEBUG) {
    console.log(...args)
  }
}

// shared store
let store = new Store()

// global event bus
let bus = new Vue()

// color
let tableau10 = '4c78a8f58518e4575672b7b254a24beeca3bb279a2ff9da69d755dbab0ac'

export {
  log_debug,
  store,
  bus,
  tableau10
}
