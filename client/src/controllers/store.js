'use strict'

import http from 'axios'
import _ from 'lodash'

/**
 * Shared data store across pages.
 */
class Store {
  constructor () {
    // decisions made in each universe
    this.universes = []

    // available decisions and their options
    this.decisions = {}
  }

  /**
   * Get the decisions made by each universe.
   * @returns {Promise<any>}
   */
  fetchUniverses () {
    const DEC_INDEX = 2 // decisions start from the 2nd column

    return new Promise((resolve, reject) => {
      if (this.universes.length) {
        resolve(this.universes)
        return
      }

      http.post('/api/get_universes', {})
        .then((response) => {
          let msg = response.data

          if (msg && msg.status === 'success') {
            // wrangle universes
            this.universes = _.map(msg.data, (d, i) => {
              let obj = {uid: i + 1}
              _.each(d, (val, idx) => {
                obj[msg.header[idx]] = val
              })
              return obj
            })

            // wrangle decisions
            this.decisions = {}
            _.each(_.slice(msg.header, DEC_INDEX), (d) => {
              this.decisions[d] = d
            })

            resolve()
          } else {
            reject(msg.message || 'Internal server error.')
          }
        }, () => {
          reject('Network error.')
        })
    })
  }

  getUniverseById (uid) {
    if (uid < 0 || uid > this.universes.length) {
      console.error('UID ')
    }

    return this.universes[uid - 1]
  }
}

export default Store
