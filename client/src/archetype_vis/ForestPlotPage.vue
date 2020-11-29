<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <div id="vis-container"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3">
      <p v-if="!err" class="text-muted">
        Point estimates (ordered by magnitude) and 95% confidence intervals.
        <span v-if="omitted">
          Only the top {{cutoff}} and bottom {{cutoff}} universes are shown.</span>
      </p>
      <p v-else class="text-danger">
        ERROR: interval estimates are not available.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import ForestPlot from './forest_plot'
  import {SCHEMA} from '../controllers/constants'

  export default {
    name: 'ForestPlotPage',
    data () {
      return {
        err: false,
        omitted: false,
        cutoff: 10
      }
    },
    mounted () {
      // fetch data from server
      store.fetchUniverses()
        .then(() => {
          return store.fetchOverview()
        })
        .then(() => {
          return store.fetchPredictions()
        })
        .then(() => {
          // check if standard error is available because
          // CI is calculated from standard error ...
          if (!(SCHEMA.STDERR in store.configs.schema)) {
            this.err = true
            return
          }

          let data = store.predicted_diff
          let chart = new ForestPlot()

          if (data.length > this.cutoff * 2) {
            this.omitted = true
          }

          chart.draw('#vis-container', data, this.cutoff)
        })
    }
  }
</script>

<style scoped>

</style>