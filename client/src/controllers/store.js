'use strict'

import http from 'axios'
import _ from 'lodash'
import {default_config} from './config'

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
     * Sensitivity of individual decisions.
     * @example {dec_A: 100, dec_B: 1}
     */
    this.sensitivity = {}

    /**
     * ADG, with the same data structure as in overview.json
     */
    this.graph = {}

    /**
     * User configurations as in overview.json
     */
    this.configs = {}

    // predicted outcomes
    this.predicted_diff = []  // sorted by effect size

    /**
     * Other possible outcomes due to sampling for each universe.
     * The array index is uid and the value is an array of possible outcomes.
     */
    this.uncertainty = []

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

    // derived data but accessed by multiple views
    this.x_range = []
    this.color_by = null
    this.uncertainty_vis = null
    this.small_multiple_uids = []
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
      if (this.predicted_diff.length) {
        resolve()
        return
      }

      http.post('/api/get_pred', {})
        .then((response) => {
          let msg = response.data

          if (msg && msg.status === 'success') {
            // predicted outcomes
            this.predicted_diff = _.map(msg.data, (d) => {
              let obj = {}
              _.each(d, (val, idx) => {
                obj[msg.header[idx]] = Number(val)
              })
              obj.diff = obj[default_config.agg_plot.x_field] // legacy
              return obj
            })

            // sort
            this.predicted_diff = _.sortBy(this.predicted_diff, (d) => d.diff)
            this.x_range = [this.predicted_diff[0].diff * 1.1,
              this.predicted_diff[this.predicted_diff.length - 1].diff * 1.1]

            // compute sensitivity
            _.each(this.decisions, (x, dec) => {
              this.sensitivity[dec] = this._computeSensitivity(dec)
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

  fetchUncertainty () {
    return new Promise((resolve, reject) => {
      if (this.uncertainty.length || default_config.agg_plot.uncertainty == null) {
        resolve()
        return
      }

      http.post('/api/get_uncertainty', {})
        .then((response) => {
          let msg = response.data

          if (msg && msg.status === 'success') {
            let i_uid = _.findIndex(msg.header, (d) => d === 'uid')
            let i_diff = _.findIndex(msg.header, (d) => d ===
              default_config.agg_plot.x_field)
            _.each(_.groupBy(msg.data, i_uid), (rows, k) => {
              this.uncertainty[k] = _.map(rows, (row) => Number(row[i_diff]))
            })

            let flat = _.flatten(this.uncertainty)
            this.x_range = [Math.min(this.x_range[0], _.min(flat)),
              Math.max(this.x_range[1], _.max(flat))]

            resolve()
          } else {
            reject(msg.message || 'Internal server error.')
          }
        }, () => {
          reject('Network error.')
        })
    })
  }

  _computeSensitivity (dec) {
    // other decisions
    let od = _.keys(this.decisions)
    _.remove(od, d => d === dec)

    // record the effect size for every combination of other decisions
    let res = {}
    _.each(this.predicted_diff, d => {
      let uni = this.getUniverseById(d.uid)
      let key = _.reduce(od, (s, dec) => s + '$' + uni[dec], '')
      if (key in res) {
        res[key].push(d.diff)
      } else {
        res[key] = [d.diff]
      }
    })

    // compute variance of each combination
    let vs = _.map(res, (arr) => {
      let avg = _.reduce(arr, (sum, a) => sum + a, 0) / arr.length
      let v = _.reduce(arr, (sum ,a) => Math.pow(a - avg, 2), 0)
      return Math.sqrt(v / arr.length)
    })

    // summary stats
    // let avg = _.reduce(vs, (sum, v) => sum + v, 0) / vs.length
    let sorted = _.sortBy(vs)
    let md = sorted[Math.floor(vs.length / 2)]

    // return the average of the variances
    return md
  }

  /**
   * Given a uid, get the universes that are most similar in predicted diff.
   * @param uid
   * @param data
   * @param num How many universes to return.
   * @returns {*}
   * @private
   */
  _getNearestUidByDiff (uid, data, num = 8) {
    data = data || this.predicted_diff

    let j = _.findIndex(data, (d) => d.uid === uid)
    let i = Math.min(Math.max(0, j - Math.floor(num / 2)),
      data.length - num)
    let uids = _.map(_.range(i, i + num), (idx) => data[idx].uid)
    let ret = _.filter(uids, (d) => d !== uid)
    ret.unshift(uid)
    return ret
  }

  getNearestUid (uid, data, num = 8) {
    return this._getNearestUidByDiff(uid, data, num)
  }

  /**
   * Get the actual and predicted outcomes of all data points for each uid.
   * @param uids An array of UIDs.
   * @returns {Promise<any>}
   */
  fetchRaw (uids) {
    return new Promise((resolve, reject) => {
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

            // config
            this.configs = _.assign(default_config, msg.data.visualizer)

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
