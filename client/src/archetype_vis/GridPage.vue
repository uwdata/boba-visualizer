<template>
  <div class="mt-3 ml-3">
    <div id="vis-container"></div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import GridPlot from './grid_plot'

  export default {
    name: 'GridPage.vue',
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
          let col = SCHEMA.P in store.configs.schema ? SCHEMA.P : SCHEMA.POINT

          let chart = new GridPlot()
          chart.draw('#vis-container', data, col)
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
