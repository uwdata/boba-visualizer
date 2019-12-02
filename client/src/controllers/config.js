'use strict'

import Store from './store'

const DEBUG = process.env.NODE_ENV === 'development'

/**
 * Only outputs if we are in dev build.
 */
function log_debug (...args) {
  if (DEBUG) {
    console.log(...args)
  }
}

/***
 * Shared store.
 * @type {Store}
 */
let store = new Store()

export {
  log_debug,
  store
}
