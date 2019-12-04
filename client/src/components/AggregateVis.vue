<template>
  <div class="h-100">
    <div class="mt-3 mb-4 text-center">Predicted Difference: Female - Male</div>
    <div id="agg-vis-container" ref="chart" class="h-100"></div>
    <detail-tip :detail="detail"></detail-tip>
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
        detail: null
      }
    },

    mounted: function () {
      set_chart_size.call(this, this.chart)

      // register event listener
      bus.$on('data-ready', draw.bind(this))

      // callbacks for SVG events
      this.chart.onDotMouseover = (d, x, y) => {
        this.detail = {uid: d.uid, diff: d.diff, x: x, y: y,
          left: this.$refs.chart.getBoundingClientRect().left}
      }

      this.chart.onDotMouseout = () => {
        this.detail = null
      }
    }
  }
</script>

<style scoped>

</style>