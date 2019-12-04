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

export {
  log_debug,
  store,
  bus
}
