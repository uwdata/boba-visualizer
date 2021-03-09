<template>
  <div>
    <div id="adg-container" ref="chart" class="h-100"></div>
  </div>
</template>

<script>
  import {bus, store} from '../controllers/config'
  import ADGPlot from '../controllers/adg_plot'
  import _ from 'lodash'

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
    data.nodes = _.map(data.nodes, (nd) => _.assign(nd,
      {'sensitivity': store.sensitivity[nd.name]}))

    // redraw
    clear.call(this)
    this.chart.draw('#adg-container', data)
  }

  function createFacet (label, ev) {
    let i = -1
    _.each(store.facet, (f, j) => {
      i = f === label ? j : i
    })
    if (i >= 0) {
      // remove existing facet
      store.facet.splice(i, 1)
    } else {
      // facet is full, remove the first element
      if (store.facet.length > 1) {
        store.facet.splice(1, 1)
      }
      if (!ev.shiftKey || !store.facet.length) {
        // replace
        store.facet = [label]
      } else {
        // add a second facet
        let ds = [store.facet[0], label]
        ds = _.map(ds, (name) => store.getDecisionByName(name))
        ds = _.sortBy(ds, (dec) => dec.options.length)
        ds = ds[1].options.length <= 3 ? _.reverse(ds) : ds
        store.facet = _.map(ds, (dec) => dec.name)
      }
    }
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
      bus.$on('adg-node-click', (label, ev) => {
        createFacet.call(this, label, ev)
        this.chart.updateFacet(store.facet)
        bus.$emit('facet')
      })
    }
  }
</script>

<style lang="stylus">
  .adg_node
    stroke #000
    stroke-width 2
    cursor pointer
    transition fill 0.2s
    &.hovered, &.facet
      fill #f58518

  .adg_node_facet_label
    text-anchor middle
    font-size 9px
    font-weight 900
    fill #fff
    cursor pointer

  .adg_node_label
    font-size 14px
    text-transform capitalize
    cursor pointer

  .adg_option
    fill #bbb
    stroke #bbb

  .adg_option_label
    font-size 9px
    fill #666

  .adg_edge
    fill none

  .adg_edge.edge_option
    stroke #bbb
    stroke-wdith 1

  .adg_edge.edge_order
    stroke #bbb

  .adg_edge.edge_procedural
    stroke #000
    stroke-width 2
</style>
