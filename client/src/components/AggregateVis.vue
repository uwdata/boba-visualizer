<template>
  <div class="h-100" ref="parent">
    <!--tool-tip-->
    <detail-tip :left="left" :top="top"></detail-tip>

    <!--chart-->
    <div id="agg-vis-container" ref="chart" class="mt-3"></div>
    <div class="text-center text-small">Predicted Difference: Female - Male</div>
    <option-ratio-view></option-ratio-view>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {bus, log_debug, store} from '../controllers/config'
  import BandPlot from '../controllers/band_plot'
  import StackedDotPlot from '../controllers/stacked_dot_plot'
  import DetailTip from './DetailTip.vue'
  import OptionRatioView from './OptionRatioView.vue'

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
    let data = []
    _.each(store.predicted_diff, (d) => {
      let uni = store.getUniverseById(d.uid)
      let pass = true
      _.each(store.filter, (x, dec) => {
        let opt = uni[dec]
        pass = pass && (store.filter[dec][opt])
      })

      if (pass) {
        data.push(d)
      }
    })

    // redraw
    clear.call(this)
    this.chart.draw('#agg-vis-container', data)
  }

  export default {
    name: "AggregateVis",
    components: {OptionRatioView, DetailTip},
    data () {
      return {
        chart: new StackedDotPlot(),
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
      bus.$on('filter', draw.bind(this))
    }
  }
</script>

<style lang="stylus">
  #agg-vis-container
    height 300px

  .dot.brushed
    fill #f00 !important
</style>