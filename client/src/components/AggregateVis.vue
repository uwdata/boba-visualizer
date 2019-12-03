<template>
  <div class="h-100">
    <div id="agg-vis-container" ref="chart" class="h-100"></div>
  </div>
</template>

<script>
  import PredictedPoint from '../controllers/predicted_point_plot'

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
    clear.call(this)
    this.chart.draw('#agg-vis-container')
  }

  export default {
    name: "AggregateVis",
    data () {
      return {
        chart: new PredictedPoint()
      }
    },
    mounted: function () {
      set_chart_size.call(this, this.chart)
      draw.call(this)
    }
  }
</script>

<style scoped>

</style>