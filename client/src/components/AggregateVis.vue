<template>
  <div ref="parent" class="d-flex flex-column">
    <!--tool-tip-->
    <detail-tip :left="left" :top="top" :detail="tooltip"></detail-tip>

    <!--chart-->
    <div v-if="title_x" class="d-flex mt-1">
      <div class="bb-divider flex-grow-1 ml-4"></div>
      <div class="ml-3 mr-3 facet-dec-title">{{title_x}}</div>
      <div class="bb-divider flex-grow-1 mr-4"></div>
    </div>
    <div v-else class="mt-3"></div>
    <div class="d-flex mt-1 flex-grow-1">
      <!--vis container-->
      <div id="agg-vis-container" ref="chart" class="ml-2 flex-grow-1"></div>

      <!--title for y-->
      <div v-if="title_y" class="d-flex flex-column mr-1">
        <div class="bb-divider-v flex-grow-1"></div>
        <div class="mt-3 mb-3 bb-text-v facet-dec-title">{{title_y}}</div>
        <div class="bb-divider-v flex-grow-1 mb-4"></div>
      </div>
      <div v-else class="mr-3"></div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {bus, store} from '../controllers/config'
  import StackedDotPlot from '../controllers/stacked_dot_plot'
  import DetailTip from './DetailTip.vue'

  function clear () {
    // remove all nodes
    let nd = document.getElementById('agg-vis-container')
    while (nd.firstChild) {
      nd.removeChild(nd.firstChild)
    }
  }

  function set_chart_size (s, nx, ny, x, y, wrap) {
    let padding = 20  // space for option title
    let title = 3  // space for decision title
    let dim_y = ny > 1 && !wrap  // whether there will be titles on the y dimension

    let w = this.$refs.chart.clientWidth - (dim_y ? title : 0)
    let h = this.$refs.chart.clientHeight - (nx > 1 ? title : 0)
    let px = dim_y && x === nx - 1 ? padding : 0
    let py = wrap || (nx > 1 && y < 1) ? padding : 0
    w = dim_y ? (w - padding) / nx : w / nx
    h = wrap ? h / ny - padding : (nx > 1 ? (h - padding) / ny : h / ny)

    s.outerWidth = Math.floor(w + px)
    s.outerHeight = Math.floor(h + py)
    s.margin.right += px
    s.margin.top += py
  }

  function applyFilter (data, filter) {
    let ret = []
    _.each(data, (d) => {
      let uni = store.getUniverseById(d.uid)
      let pass = true
      _.each(filter, (x, dec) => {
        let opt = uni[dec]
        pass = pass && (filter[dec][opt])
      })

      if (pass) {
        ret.push(d)
      }
    })
    return ret
  }

  function applyFacet (data) {
    this.title_x = store.facet[0]
    this.title_y = store.facet[1]

    let sub = []
    let titles = []
    let wrap = false
    if (store.facet.length === 0) {
      sub = [[data]]
      titles = [[{}]]
    } else {
      let decx = store.getDecisionByName(store.facet[1]) || {options: [null]}
      _.each(decx.options, (optx) => {
        let dec = store.getDecisionByName(store.facet[0])
        let row = _.map(dec.options, (opt) => {
          return _.filter(data, (d) => {
            let uni = store.getUniverseById(d.uid)
            let b = optx == null ? true : uni[decx.name] === optx
            return uni[dec.name] === opt && b
          })
        })
        sub.push(row)
        titles.push(_.map(dec.options, (opt) => {
          return {x: opt, y: optx}
        }))
      })

      // now optimize for better aspect ratio
      if (sub.length < 2 && sub[0].length > 3) {
        wrap = true
        let i = Math.ceil(sub[0].length / 2)
        sub.push(sub[0].slice(i, sub[0].length))
        sub[0] = sub[0].slice(0, i)
        titles.push(titles[0].slice(i, titles[0].length))
        titles[0] = titles[0].slice(0, i)
      }
    }

    return {data: sub, labels: titles, wrap: wrap}
  }

  function getUncertainty (data) {
    let res = {}
    if (store.uncertainty.length) {
      _.each(data, (d) => {
        res[d.uid] = store.uncertainty[d.uid]
      })
    }
    return res
  }

  function draw () {
    // remove previous charts
    clear.call(this)
    this.charts = []

    // filter data
    let data = applyFilter(store.predicted_diff, store.filter)

    // facet data
    let tmp = applyFacet.call(this, data)
    data = tmp.data
    let labels = tmp.labels

    // redraw
    _.each(data, (row, ir) => {
      let g = document.createElement('div')
      g.setAttribute('class', 'd-flex')

      document.getElementById('agg-vis-container').appendChild(g)
      _.each(row, (sp, ip) => {
        let div_id = `agg-vis-${ir}-${ip}`
        let div = document.createElement('div')
        div.setAttribute('id', div_id)
        g.appendChild(div)

        let chart = new StackedDotPlot()
        set_chart_size.call(this, chart, row.length, data.length, ip, ir, tmp.wrap)
        chart.title = ''
        chart.row_title = tmp.wrap ? labels[ir][ip].x
          : ir === 0 ? labels[ir][ip].x : null
        chart.col_title = ip === row.length - 1 ? labels[ir][ip].y : null
        chart.y_axis_label = ip === 0 ? 'Count' : ' '
        chart.x_axis_label = ir === data.length - 1 ? this.label : ' '
        chart.color_by = store.color_by
        chart.uncertainty_vis = store.uncertainty_vis
        chart.clicked_uids = store.small_multiple_uids
        chart.draw(`#${div_id}`, data[ir][ip], getUncertainty(data[ir][ip]))

        this.charts.push(chart)
      })
    })
  }

  export default {
    name: "AggregateVis",
    components: {DetailTip},
    data () {
      return {
        label: '',
        charts: [],
        title_x: null,
        title_y: null,
        left: 0,
        top: 0,
        tooltip: null
      }
    },

    mounted: function () {
      // update positions
      this.left = this.$refs.parent.getBoundingClientRect().left
      this.top = this.$refs.parent.getBoundingClientRect().top

      // register event listener
      bus.$on('data-ready', () => {
        this.label = store.configs.agg_plot.x_axis_label
        draw.call(this)
      })
      bus.$on('filter', draw.bind(this))
      bus.$on('facet', draw.bind(this))
      bus.$on('update-scale', () => {
        _.each(this.charts, (chart) => {
          chart.updateScale()
        })
      })
      bus.$on('update-color', () => {
        _.each(this.charts, (chart) => {
          chart.updateColor(store.color_by)
        })
      })
      bus.$on('update-uncertainty', () => {
        _.each(this.charts, (chart) => {
          chart.updateUncertainty(store.uncertainty_vis)
        })
      })

      // register here, otherwise need to call $off on destroyed charts
      bus.$on('brush-remove', (s) => {
        _.each(this.charts, (chart) => {
          if (s !== chart.brush.selector) {
            chart.brush.clear()
          }
        })
      })

      bus.$on('agg-vis.dot-click', (uid, data) => {
        let uids = store.getNearestUid(uid, data)
        bus.$emit('update-small-multiples', uids)

        _.each(this.charts, (chart) => {
          chart.clicked_uids = uids
          chart.colorClicked()
        })
      })

      // empty brush removes small multiples (simulate clicking elsewhere)
      bus.$on('brush', (sel) => {
        if (!sel || sel.length < 1) {
          _.each(this.charts, (chart) => {
            chart.clicked_uids = []
            chart.clearClicked()
          })
          bus.$emit('update-small-multiples', [])
        }
      })
    }
  }
</script>

<style lang="stylus">
  .bb-divider
    border-bottom 1px solid rgba(0,0,0,0.08)
    margin-bottom 0.6rem

  .bb-divider-v
    border-left 1px solid rgba(0,0,0,0.08)
    margin-left 0.5rem

  .facet-dec-title
    font-size 11px
    font-weight 500
    color #4c555d
    text-transform capitalize !important

  .bb-text-v
    writing-mode vertical-rl
    text-orientation mixed

  .facet-title
    fill #fafafa

  .facet-title-text
    fill #4c555d
    font-weight 500
    pointer-events none

  .dot.colored
    fill #e45756

  .dot.colored.brushed
    fill #ff8786

  .dot.brushed, .dot.hovered
    fill #37c2e8

  .dot.clicked, .dot.clicked.brushed
    fill #f58518

  .dot.hidden
    display none !important

  .dot
    fill #3e8dc3
    cursor pointer

  .envelope
    fill #999
    opacity 0.15
    stroke-linejoin round

  .uncertainty-curve
    fill none
    stroke #000
    opacity 0.08
    stroke-width 1
    stroke-linejoin round
    cursor pointer

  .uncertainty-curve.from-dot
    stroke #37c2e8
    opacity 1

  .uncertainty-curve.colored
    stroke #e45756

  .uncertainty-curve.hovered
    stroke #f58518
    opacity 1
    stroke-width 2

  .uncertainty-curve.clicked
    stroke #f58518
    opacity 0.7
</style>
