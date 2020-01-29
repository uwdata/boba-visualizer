<template>
  <div ref="parent">
    <!--tool-tip-->
    <detail-tip :left="left" :top="top" :detail="tooltip"
                :offset="0"></detail-tip>

    <!--title-->
    <div v-if="uid >= 0" class="bb-bar-title mt-3 ml-3">Observed vs. Predicted</div>

    <!--plots-->
    <div id="raw-vis-container" class="mt-1 ml-0 mr-0 row">
      <div id="raw-vis-1" ref="chart" class="col-3 mt-2"></div>
      <div v-for="i in [2,3,4,5,6,7,8]" class="col-3 mt-2" :id="`raw-vis-${i}`"></div>
    </div>
  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  import RawPlot from '../controllers/raw_plot'
  import _ from 'lodash'
  import DetailTip from './DetailTip.vue'

  function clear () {
    // remove all nodes
    let children = document.getElementById('raw-vis-container').childNodes
    _.each(children, (nd) => {
      while (nd.firstChild) {
        nd.removeChild(nd.firstChild)
      }
    })
  }

  function update (uids) {
    // fetch data
    store.fetchRaw(uids)
      .then((ret) => {
        this.uid = uids[0]
        draw.call(this, ret)
      }, (e) => {
        console.error(e)
      })
  }

  function draw (all_data) {
    // remove previous charts
    clear.call(this)

    // transform data
    // fixme
    _.each(all_data, (data) => {
      data.actual = _.map(data.actual, (d) => Math.log2(d + 1))
      data.pred = _.map(data.pred, (d) => Math.log2(d + 1))
    })

    // compute range for shared scale
    let tmp = _.flatten(_.map(all_data, (d) => _.concat(d.actual, d.pred)))
    let range = [_.min(tmp), _.max(tmp)]

    _.each(all_data, (data, idx) => {
      // redraw
      let chart = new RawPlot()
      chart.outerWidth = this.$refs.chart.clientWidth - 30
      chart.title = `Universe ${data.uid}`
      chart.dot_opacity = 0.2
      chart.draw(`#raw-vis-${idx + 1}`, data, range)
    })

  }

  export default {
    name: "SmallMultiplesView",
    components: {DetailTip},
    data () {
      return {
        uid: -1,
        left: 0,
        top: 0,
        tooltip: null
      }
    },

    mounted: function () {
      // for tooltip positions
      this.left = this.$refs.parent.getBoundingClientRect().left
      // hard coding, since it's impossible to know the correct top from here
      this.top = 300

      // tooltip event
      bus.$on('raw.mouseover', (d) => {
        this.tooltip = {uid: d.uid, x: d.x, y: d.y}
      })
      bus.$on('raw.mouseout', () => {
        this.tooltip = null
      })

      // register event listeners
      bus.$on('agg-vis.dot-click', update.bind(this))
      bus.$on('brush', () => {
        this.uid = -1
        clear.call(this)
      })
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
