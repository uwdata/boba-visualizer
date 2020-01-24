<template>
  <div ref="parent" class="d-flex flex-column">
    <!--tool-tip-->
    <detail-tip :left="left" :top="top"></detail-tip>

    <!--chart-->
    <div id="agg-vis-container" ref="chart" class="mt-3 ml-2 h-100"></div>

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

  function set_chart_size (s, nx, ny, x, y) {
    let padding = 20
    let w = this.$refs.chart.clientWidth
    let h = this.$refs.chart.clientHeight
    let px = ny > 1 && x === nx - 1 ? padding : 0
    let py = nx > 1 && y < 1 ? padding : 0
    w = ny > 1 ? (w - padding) / nx : w / nx
    h = nx > 1 ? (h - padding) / ny : h / ny

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
    let sub = []
    let titles = []
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
    }

    return {data: sub, labels: titles}
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
        set_chart_size.call(this, chart, row.length, data.length, ip, ir)
        chart.title = ''
        chart.row_title = ir === 0 ? labels[ir][ip].x : null
        chart.col_title = ip === row.length - 1 ? labels[ir][ip].y : null
        chart.y_axis_label = ip === 0 ? 'Count' : ' '
        chart.x_axis_label = ir === data.length - 1 ? this.label : ' '
        chart.draw(`#${div_id}`, data[ir][ip])

        this.charts.push(chart)
      })
    })
  }

  export default {
    name: "AggregateVis",
    components: {DetailTip},
    data () {
      return {
        label: 'Predicted Difference: Female - Male',
        charts: [],
        left: 0,
        top: 0
      }
    },

    mounted: function () {
      // update positions
      this.left = this.$refs.parent.getBoundingClientRect().left
      this.top = this.$refs.parent.getBoundingClientRect().top

      // register event listener
      bus.$on('data-ready', draw.bind(this))
      bus.$on('filter', draw.bind(this))
      bus.$on('facet', draw.bind(this))

      // register here, otherwise need to call $off on destroyed charts
      bus.$on('brush-remove', (s) => {
        _.each(this.charts, (chart) => {
          if (s !== chart.brush.selector) {
            chart.brush.clear()
          }
        })
      })
      bus.$on('agg-vis.dot-click', () => {
        _.each(this.charts, (chart) => {
          chart.brush.clear()
        })
      })
    }
  }
</script>

<style lang="stylus">
  .facet-title
    fill #eee

  .dot.brushed
    fill #f00 !important

  .dot
    fill #333
</style>
