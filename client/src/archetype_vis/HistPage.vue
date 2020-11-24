<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <div id="vis-container"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3" style="padding-left: 50px">
      <p class="text-muted">
        Histogram of {{column}} for the multiverse.
        The dashed line indicates {{column}}={{cutoff}}.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import HistPlot from './histogram'

  export default {
    name: 'HistPage.vue',
    data () {
      return {
        column: 'p-value',
        cutoff: 0.05
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
          let chart = new HistPlot()
          this.column = SCHEMA.P

          if (!(SCHEMA.P in store.configs.schema)) {
            // use point estimates if p-value is unavailable
            this.column = SCHEMA.POINT
            this.cutoff = 0
          }

          chart.draw('#vis-container', data, this.column, this.cutoff)
        })
    }
  }
</script>

<style scoped>

</style>
