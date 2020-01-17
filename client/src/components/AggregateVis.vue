<template>
  <div ref="parent" class="d-flex flex-column">
    <!--tool-tip-->
    <detail-tip :left="left" :top="top"></detail-tip>

    <!--trellis plot row title-->
    <div v-if="facet_row.length" class="w-100 d-flex text-small font-weight-bold mt-1 mb-1">
      <div v-for="t in facet_row" class="facet-title-row text-center">{{t}}</div>
    </div>
    <div v-else class="mt-3"></div>
    <!--chart-->
    <div id="agg-vis-container" ref="chart" class="ml-2 h-100"></div>

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

  function set_chart_size (s, nx, ny) {
    s.outerWidth = Math.floor(this.$refs.chart.clientWidth / nx)
    s.outerHeight = Math.floor(this.$refs.chart.clientHeight / ny)
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

  function draw () {
    // remove previous charts
    clear.call(this)

    // filter data
    let data = applyFilter(store.predicted_diff, store.filter)

    // facet data
    let sub = []
    if (store.facet.length === 0) {
      sub = [[data]]
      this.facet_row = []
    } else {
      let decx = store.getDecisionByName(store.facet[1]) || {options: [null]}
      _.each(decx.options, (optx) => {
        let dec = store.getDecisionByName(store.facet[0])
        this.facet_row = dec.options
        let row = _.map(dec.options, (opt) => {
          return _.filter(data, (d) => {
            let uni = store.getUniverseById(d.uid)
            let b = optx == null ? true : uni[decx.name] === optx
            return uni[dec.name] === opt && b
          })
        })
        sub.push(row)
      })
    }

    // redraw
    _.each(sub, (row, ir) => {
      let g = document.createElement('div')
      g.setAttribute('class', 'd-flex')

      document.getElementById('agg-vis-container').appendChild(g)
      _.each(row, (sp, ip) => {
        let div_id = `agg-vis-${ir}-${ip}`
        let div = document.createElement('div')
        div.setAttribute('id', div_id)
        g.appendChild(div)

        let chart = new StackedDotPlot()
        set_chart_size.call(this, chart, row.length, sub.length)
        chart.title = ''
        chart.y_axis_label = ip === 0 ? 'Count' : ' '
        chart.x_axis_label = ir === row.length - 1 ? this.label : ' '
        chart.draw(`#${div_id}`, sub[ir][ip])
      })
    })
  }

  export default {
    name: "AggregateVis",
    components: {DetailTip},
    data () {
      return {
        label: 'Predicted Difference: Female - Male',
        facet_row: ['dam', 'log_dam'],
        facet_col: ['ols_regression', 'negative_binomial'],
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
    }
  }
</script>

<style lang="stylus">
  .facet-title-row
    background-color #eee
    width: 100%
    margin-left 1rem
    margin-right 1rem
    &:first-child
      margin-left 1.5rem

  .dot.brushed
    fill #f00 !important

  .dot
    fill #333
</style>
