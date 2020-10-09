<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <div id="vis-container"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3">
      <p class="text-muted">
        Columns map to decisions. Cells represent {{column}}.
        Cells where {{column}} < {{cutoff}} are shaded in gray.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import GridPlot from './grid_plot'

  export default {
    name: 'GridPage.vue',
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
          let chart = new GridPlot()
          this.column = SCHEMA.P

          if (!(SCHEMA.P in store.configs.schema)) {
            // use point estimates if p-value is unavailable
            this.column = SCHEMA.POINT
            this.cutoff = 0
            chart.color_func = GridPlot.colorBinary.bind(null, this.cutoff)
          }

          chart.draw('#vis-container', data, this.column)
        })
    }
  }
</script>

<style lang='stylus'>
  #vis-container
    overflow auto

  .cell
    stroke black
    stroke-width 1
    fill-opacity 0.2

  .cell-text
    font-size 11px
    fill #666

  .grid-label
    font-size 11px

  .grid-guide
    stroke #555
    stroke-width 1
</style>
