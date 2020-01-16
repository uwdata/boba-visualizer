<template>
  <div>
    <div id="adg-container" ref="chart" class="h-100"></div>
  </div>
</template>

<script>
  import {bus, store} from '../controllers/config'
  import ADGPlot from '../controllers/adg_plot'

  function clear () {
    // remove all nodes
    let nd = document.getElementById('adg-container')
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
    let data = store.graph

    // redraw
    clear.call(this)
    this.chart.draw('#adg-container', data)
  }

  export default {
    name: "AdgView",

    data () {
      return {
        chart: new ADGPlot()
      }
    },

    mounted: function () {
      // update sizes and positions
      set_chart_size.call(this, this.chart)

      // register event listener
      bus.$on('data-ready', draw.bind(this))
    }
  }
</script>

<style lang="stylus">
  .adg_node
    fill #fff
    stroke #000
    stroke-width 2
    cursor pointer

  .adg_node_label
    font-size 14px
    text-transform capitalize
    cursor pointer

  .adg_edge
    fill none
    stroke-width 2

  .adg_edge.edge_order
    stroke #bbb

  .adg_edge.edge_procedural
    stroke #000
</style>