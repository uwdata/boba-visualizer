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
  import {bus, log_debug, store} from '../controllers/config'
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
    let titles = []
    if (store.facet.length === 0) {
      sub = [[data]]
      titles = [['']]
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
        titles.push(_.map(dec.options, (opt) => opt + (optx ? `, ${optx}` : '')))
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
        chart.title = titles[ir][ip]
        chart.draw(`#${div_id}`, sub[ir][ip])
      })
    })
  }

  export default {
    name: "AggregateVis",
    components: {DetailTip},
    data () {
      return {
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
  .dot.brushed
    fill #f00 !important

  .dot
    fill #333
</style>
