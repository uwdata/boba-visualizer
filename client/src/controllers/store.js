'use strict'

import http from 'axios'
import _ from 'lodash'
import {log_debug} from './config'

/**
 * Shared data store across pages.
 */
class Store {
  constructor () {
    // decisions made in each universe
    this.universes = []

    // available decisions and their options
    this.decisions = {}

    // ADG
    this.graph = {}

    // predicted outcomes
    this.predictions = []
    this.predicted_diff = []
  }

  /**
   * Get the decisions made by each universe.
   * @returns {Promise<any>}
   */
  fetchUniverses () {
    return new Promise((resolve, reject) => {
      if (this.universes.length) {
        resolve()
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

            resolve()
          } else {
            reject(msg.message || 'Internal server error.')
          }
        }, () => {
          reject('Network error.')
        })
    })
  }

  /**
   * Get the predicted outcomes.
   * @returns {Promise<any>}
   */
  fetchPredictions () {
    return new Promise((resolve, reject) => {
      if (this.predictions.length) {
        resolve()
        return
      }

      http.post('/api/get_pred', {})
        .then((response) => {
          let msg = response.data

          if (msg && msg.status === 'success') {
            // predicted outcomes
            this.predictions = _.map(msg.data, (d) => {
              let obj = {}
              _.each(d, (val, idx) => {
                obj[msg.header[idx]] = Number(val)
              })
              return obj
            })

            // compute predicted difference
            // fixme: hard code
            this.predicted_diff = []
            _.each(_.range(0, msg.data.length, 2), (i) => {
              let tup = [msg.data[i], msg.data[i + 1]]
              let male = _.find(tup, (arr) => arr[1] === "0")
              let female = _.find(tup, (arr) => arr[1] === "1")
              this.predicted_diff.push({uid: Number(male[0]), diff: female[2] - male[2]})
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

  /**
   * Get the multiverse overview, including decisions and ADG.
   * @returns {Promise<any>}
   */
  fetchOverview () {
    return new Promise((resolve, reject) => {
      if (_.size(this.graph)) {
        resolve()
        return
      }

      http.post('/api/get_overview', {})
        .then((response) => {
          let msg = response.data

          if (msg && msg.status === 'success') {
            // decisions
            this.decisions = {}
            _.each(msg.data.decisions, (dec) => {
              this.decisions[dec.var] = dec.options
            })

            // graph
            this.graph = msg.data.graph
            log_debug(this.graph)

            resolve()
          } else {
            reject(msg.message || 'Internal server error.')
          }
        }, () => {
          reject('Network error.')
        })
    })
  }

  /**
   * Given an uid, return the universe object.
   * @param uid
   * @returns {*}
   */
  getUniverseById (uid) {
    if (uid == null || uid < 0 || uid > this.universes.length) {
      console.error(`UID ${uid} is not valid`)
      return
    }

    return this.universes[uid - 1]
  }

  /**
   * Given an array of uid, count the occurrence of each options.
   * @param uids
   */
  getOptionRatio (uids) {
    // initialize a dict
    let res = {}
    _.each(this.decisions, (v, k) => {
      res[k] = _.map(v, (opt) => {
        return {name: opt, count: 0}
      })
    })

    // count the options
    let us = _.map(uids, (u) => this.getUniverseById(u))
    _.each(us, (uni) => {
      _.each(_.keys(this.decisions), (dec) => {
        let opt = uni[dec]
        let i = _.indexOf(this.decisions[dec], opt)

        // sanity check
        if (res[dec][i].name !== opt) {
          console.error(`Option mismatch: ${opt} in ${dec}`, res, this.decisions)
        }

        res[dec][i].count += 1
      })
    })

    return res
  }
}

export default Store
