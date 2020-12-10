<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <div id="vis-container"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3">
      <p class="text-muted">
        Cumulative distribution of {{field}} for the multiverse.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import DensityPlot from './density_plot'

  export default {
    name: 'DensityPage',
    data () {
      return {
        field: 'outcome'
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
          let data = store.predicted_diff
          let chart = new DensityPlot()
          this.field = store.configs.x_axis
          chart.x_label = store.configs.x_axis

          // CDF
          chart.type = 1

          chart.draw('#vis-container', data)
        })
    }
  }
</script>
