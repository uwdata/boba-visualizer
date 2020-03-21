<template>
  <div class="mt-3 ml-3">
    <div id="vis-container"></div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import SpecCurvePlot from '../controllers/spec_curve_plot'

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
          let data = store.predicted_diff
          let l = data.length

          // keep the top 50, bottom 50 and a subset of 200 in-between
          // ok we excluded the top 30 to be consistent with our range
          let bottom = _.slice(data, 0, 50)
          let top =  _.slice(data, l - 80, l - 30)
          let middle = {}
          while (_.size(middle) < 200) {
            let i = _.random(50, l - 81)
            middle[i] = i
          }
          middle = _.sortBy(_.map(middle, (i) => data[i]), (d) => d.diff)
          data = _.concat(bottom, middle, top)

          // join decision
          data = _.map(data, (d, idx) => {
            d.i = idx
            let u = store.getUniverseById(d.uid)
            return _.assign(d, u)
          })

          let chart = new SpecCurvePlot()
          chart.draw('#vis-container', data)
        })
    }
  }
</script>

<style scoped>

</style>