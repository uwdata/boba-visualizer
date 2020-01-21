<template>
  <div>
    <div v-if="uid >= 0" class="bb-bar-title mt-3 ml-3">Actual vs. Predicted</div>
    <div id="raw-vis-container" class="mt-1 ml-0 mr-0 row">
      <div id="raw-vis-1" ref="chart" class="col-3"></div>
      <div v-for="i in [2,3,4]" class="col-3" :id="`raw-vis-${i}`"></div>
    </div>
  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  import RawPlot from '../controllers/raw_plot'
  import _ from 'lodash'

  function clear () {
    // remove all nodes
    let children = document.getElementById('raw-vis-container').childNodes
    _.each(children, (nd) => {
      while (nd.firstChild) {
        nd.removeChild(nd.firstChild)
      }
    })
  }

  function update (d) {
    // fetch data
    store.fetchRaw(d.uid)
      .then((ret) => {
        this.uid = d.uid
        draw.call(this, ret)
      }, (e) => {
        console.error(e)
      })
  }

  function draw (data) {
    // remove previous charts
    clear.call(this)

    // transform data
    // fixme
    data.actual = _.map(data.actual, (d) => Math.log2(d + 1))
    data.pred = _.map(data.pred, (d) => Math.log2(d + 1))

    // redraw
    let chart = new RawPlot()
    chart.outerWidth = this.$refs.chart.clientWidth - 30
    chart.title = `Universe ${this.uid}`
    chart.draw(`#raw-vis-1`, data)
  }

  export default {
    name: "SmallMultiplesView",

    data () {
      return {
        uid: -1,
      }
    },

    mounted: function () {
      // register event listeners
      bus.$on('agg-vis.dot-click', update.bind(this))
    }
  }
</script>

<style lang="stylus">
  .violin-curve
    fill none
    stroke #000
    stroke-width 1
    stroke-linejoin round

  .raw-dot
    fill #17a2b8

  .pred-dot
    fill #f58518
</style>
