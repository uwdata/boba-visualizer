<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5 d-flex">
      <div id="container-curve" class="mr-3"></div>
      <div id="container-hist"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3">
      <p class="text-muted">
        <i>p</i>-curve (left) and the corresponding histogram (right).
        The graphs are based on the p-values of statistically significant estimates of {{field}}.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import HistPlot from './histogram'
  import PCurve from './p_curve_plot'

  export default {
    name: 'PCurvePage',
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
          this.field = store.configs.x_axis

          // filter to include only significant p-value
          let data = store.predicted_diff
          data = _.filter(data, (d) => d[SCHEMA.P] <= 0.05)

          // p-curve on the left
          let plot = new PCurve()
          plot.draw('#container-curve', _.map(data, (d) => d[SCHEMA.P]))

          // histogram on the right
          let chart = new HistPlot()
          chart.outerWidth = 450
          chart.outerHeight = 390
          chart.n_bins = 20
          chart.count = false
          chart.x_label = this.field
          chart.y_label = 'Share of significant p-value'
          chart.draw('#container-hist', data, SCHEMA.POINT)
        })
    }
  }
</script>
