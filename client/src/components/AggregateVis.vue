<template>
  <div class="h-100" ref="parent">
    <div class="mt-3 mb-4 text-center">Predicted Difference: Female - Male</div>
    <div id="agg-vis-container" ref="chart" class="h-100"></div>
    <detail-tip :left="left" :top="top"></detail-tip>
  </div>
</template>

<script>
  import {bus, log_debug, store} from '../controllers/config'
  import PredictedPoint from '../controllers/predicted_point_plot'
  import DetailTip from './DetailTip.vue'

  function clear () {
    // remove all nodes
    let nd = document.getElementById('agg-vis-container')
    while (nd.firstChild) {
      nd.removeChild(nd.firstChild)
    }
  }

  function set_chart_size (s) {
    s.outerWidth = this.$refs.chart.clientWidth
    s.outerHeight = this.$refs.chart.clientHeight
  }

  function draw () {
    // prepare data
    let data = store.predicted_diff

    // redraw
    clear.call(this)
    this.chart.draw('#agg-vis-container', data)
  }

  export default {
    name: "AggregateVis",
    components: {DetailTip},
    data () {
      return {
        chart: new PredictedPoint(),
        left: 0,
        top: 0
      }
    },

    mounted: function () {
      // update sizes and positions
      set_chart_size.call(this, this.chart)
      this.left = this.$refs.parent.getBoundingClientRect().left
      this.top = this.$refs.parent.getBoundingClientRect().top

      // register event listener
      bus.$on('data-ready', draw.bind(this))
    }
  }
</script>

<style scoped>

</style>