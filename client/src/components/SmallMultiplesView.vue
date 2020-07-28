<template>
  <div ref="parent">
    <!--tool-tip-->
    <detail-tip :left="left" :top="top" :detail="tooltip"
                :offset="0"></detail-tip>

    <!--legend-->
    <div v-if="uid > 0" class="mt-2 mr-4 text-right" style="font-size: 11px">
      <span class="raw-legend"><i class="fas fa-circle"></i></span>
      <span class="ml-1 text-muted">Observed</span>
      <span class="pred-legend ml-2"><i class="fas fa-circle"></i></span>
      <span class="ml-1 text-muted">Predicted</span>
    </div>

    <!--plots-->
    <div id="raw-vis-container" class="ml-4">
      <div id="raw-vis-1" ref="chart" class="mt-2 mr-4"></div>
      <div v-for="i in [2,3,4,5,6,7,8]" class="mt-2 mr-4" :id="`raw-vis-${i}`"></div>
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
    store.small_multiple_uids = uids

    // empty uids
    if (!uids || uids.length < 1) {
      this.uid = -1
      clear.call(this)
      return
    }

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

    // compute range for shared scale
    let tmp = _.flatten(_.map(all_data, (d) => _.concat(d.actual, d.pred)))
    let range = [_.min(tmp), _.max(tmp)]

    _.each(all_data, (data, idx) => {
      // redraw
      let chart = new RawPlot()
      chart.outerWidth = this.$refs.chart.clientWidth
      chart.title = `Universe ${data.uid}`
      chart.x_axis_label = store.configs.x_axis_fit
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
      this.left = 0 // this.$refs.parent.getBoundingClientRect().left
      // hard coding, since it's impossible to know the correct top from here
      this.top = 0

      // tooltip event
      bus.$on('raw.mouseover', (d) => {
        this.tooltip = {uid: d.uid, x: d.x, y: d.y}
      })
      bus.$on('raw.mouseout', () => {
        this.tooltip = null
      })

      // register event listeners
      bus.$on('update-small-multiples', update.bind(this))
    }
  }
</script>

<style lang="stylus">
  #raw-vis-container
    height calc(100vh - 10rem)
    overflow-y scroll

  .violin-curve
    fill none
    stroke #000
    stroke-width 1
    stroke-linejoin round

  .axis.muted
    .domain
      stroke #6c757d
    .tick text
      fill #6c757d

  text.axis-label.muted
    fill #6c757d

  .raw-dot
    fill #EF5FA7

  .raw-legend
    color #EF5FA7

  .pred-dot
    fill #17a2b8

  .pred-legend
    color #17a2b8
</style>
