<template>
  <div class="mt-3 ml-3">
    <div id="vis-container"></div>
  </div>
</template>

<script>
  import {store, util} from '../controllers/config'
  import SpecCurvePlot from './spec_curve_plot'

  function sample (arr, extreme = 50, total = 300) {
    // keep the top 50, bottom 50 and a subset of 200 in-between
    let l = arr.length
    if (l < total || extreme * 2 >= total) {
      return arr
    }

    let bottom = _.slice(arr, 0, extreme)
    let top =  _.slice(arr, l - extreme, l)
    let middle = {}
    while (_.size(middle) < total - extreme * 2) {
      let i = _.random(extreme, l - extreme - 1)
      middle[i] = i
    }
    middle = _.sortBy(_.map(middle, (i) => arr[i]), (d) => d.diff)
    return _.concat(bottom, middle, top)
  }

  export default {
    mounted: function () {
      // fetch data from server
      store.fetchUniverses()
        .then(() => {
          return store.fetchOverview()
        })
        .then(() => {
          return store.fetchPredictions()
        })
        .then(() => {
          return store.fetchNull()
        })
        .then(() => {
          let data = store.predicted_diff
          let l = data.length

          if (store.configs.dataset === 'hurricane') {
            // ok we excluded the top 30 to be consistent with our range
            data = _.slice(data, 0, l - 30)
          }
          
          // keep the top 50, bottom 50 and a subset of 200 in-between
          data = sample(data)

          // join decision and null CI
          data = _.map(data, (d, idx) => {
            d.i = idx
            let nd = store.null_dist[d.uid]
            if (nd) {
              // get the 2.5 and 97.5 percentile
              d.upper = util.quantile(nd, 0.975)
              d.lower = util.quantile(nd, 0.025)
            }

            let u = store.getUniverseById(d.uid)
            return _.assign(d, u)
          })

          let chart = new SpecCurvePlot()
          chart.draw('#vis-container', data)
        })
    }
  }
</script>

<style lang="stylus">
  .spec-curve-envelope
    fill #eee
    stroke #bbb
    stroke-width 1.5
</style>