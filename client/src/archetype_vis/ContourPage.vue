<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <div id="vis-container"></div>
    </div>

    <!--caption-->
    <div v-if="!err" class="text-small mt-3 ml-5 mr-3">
      <p class="text-muted">
        Contour plot visualizing the vibration of effects.
        Dashed lines indicate the median, 1st and 99th percentiles.
      </p>
    </div>
    <div v-else class="mt-3 ml-3 text-danger">
      Error: cannot find required fields (point estimates and p-values)
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import VolcanoPlot from './volcano_plot'

  export default {
    name: 'ContourPage',
    data () {
      return {
        err: false
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
          // the data must have p-value
          if (!(SCHEMA.P in store.configs.schema)) {
            this.err = true
            return
          }

          let data = store.predicted_diff
          let chart = new VolcanoPlot()

          chart.contour = true
          chart.draw('#vis-container', data)
        })
    }
  }
</script>

<style scoped>

</style>
