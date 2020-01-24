'use strict'

import http from 'axios'
import _ from 'lodash'

/**
 * Shared data store across pages.
 */
class Store {
  constructor () {
    /**
     * Metadata of each universe, including the decisions made.
     * Each universe is an object in the array, using the following format.
     * @example [{uid: 1, dec_A: "a1", dec_B: "b2"}]
     */
    this.universes = []

    /**
     * Available decisions and their options.
     * The key is the decision name and the value is the option array.
     * @example {dec_A: ["a1", "a2"], dec_B: ["b1", "b2"]}
     */
    this.decisions = {}

    /**
     * ADG, with the same data structure as in overview.json
     */
    this.graph = {}

    // predicted outcomes
    this.predictions = []
    this.predicted_diff = []  // sorted by effect size

    /**
     * Filter based on decisions.
     * Key is the decision name, value is a map of options.
     * If false, all universes with this option will be dropped in the plot.
     * @example {dec_A: {a1: true, a2: false}}
     */
    this.filter = {}

    /**
     * Dimensions to facet aggregate view.
     */
    this.facet = []
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

            // sort
            this.predicted_diff = _.sortBy(this.predicted_diff, (d) => d.diff)

            // store the index in this.universes for O(1) lookup
            _.each(this.predicted_diff, (d, i) => {
              this.universes[d.uid - 1]._pred_index = i
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
   * Given a uid, get the universes that are most similar in predicted diff.
   * @param uid
   * @param num How many universes to return.
   * @returns {*}
   * @private
   */
  _getNearestUidByDiff (uid, num = 8) {
    let j = this.getUniverseById(uid)._pred_index
    let i = Math.min(Math.max(0, j - Math.floor(num / 2)),
      this.predicted_diff.length - num)
    let uids = _.map(_.range(i, i + num), (idx) => this.predicted_diff[idx].uid)
    return _.filter(uids, (d) => d !== uid)
  }

  /**
   * Get the actual and predicted outcomes of all data points for a given uid.
   * @param uid
   * @returns {Promise<any>}
   */
  fetchRaw (uid) {
    return new Promise((resolve, reject) => {
      // get nearest neighbors
      let uids = this._getNearestUidByDiff(uid)
      uids.unshift(uid)

      // send requests
      Promise.all(_.map(uids, (u) => http.post('/api/get_raw', {'uid': u})))
        .then((values) => {
          let err = ''
          let ret = _.map(values, (response, idx) => {
            let msg = response.data

            if (msg && msg.status === 'success') {
              let actual = msg.data[0]
              let pred = msg.data[1]

              return {'actual': actual, 'pred': pred, 'uid': uids[idx]}
            } else {
              err = msg.message || 'Internal server error.'
            }
          })

          if (err) {
            reject(err)
          } else {
            resolve(ret)
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
            this.resetFilter()

            // graph
            this.graph = msg.data.graph

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

  /**
   * Reset the filter based on decisions
   */
  resetFilter () {
    let f = {}
    _.each(this.decisions, (opts, dec) => {
      f[dec] = {}
      _.each(opts, (opt) => {
        f[dec][opt] = true
      })
    })

    this.filter = f
  }

  getDecisionByName (name) {
    if (! _.has(this.decisions, name)) {
      return null
    }
    return {name: name, options: this.decisions[name]}
  }
}

export default Store
