<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <div id="vis-container"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3">
      <p v-if="!err" class="text-muted">
        Each line is a universe.
        The x-axis shows the levels within the parameter "{{dec}}",
        and the y-axis shows whether the p-value is below 0.05.
      </p>
      <p v-else class="text-danger">
        ERROR: p-value is not available.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import ParallelLinePlot from './parallel_line_plot'

  function randInt(max) {
    return Math.floor(Math.random() * Math.floor(max))
  }

  export default {
    name: 'ParallelLinePlot',
    data () {
      return {
        dec: '',
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
          if (!(SCHEMA.P in store.configs.schema)) {
            this.err = true
            return
          }

          let data = store.predicted_diff

          // ok pick a decision randomly
          let decs = _.keys(store.decisions)
          this.dec = decs[randInt(decs.length)]

          let chart = new ParallelLinePlot()
          chart.draw('#vis-container', data, this.dec)
        })
    }
  }
</script>
