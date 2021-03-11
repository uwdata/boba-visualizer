<template>
  <div class="mn-card d-flex flex-column">
    <!--Title-->
    <div>
      <div class="mn-card-title-lg">Main Effect</div>
    </div>

    <!--Body-->
    <div class="h-100 d-flex flex-column">

      <!--Facet plot title-->
      <div v-if="title_x" class="d-flex mt-1">
        <div class="bb-divider flex-grow-1 ml-4"></div>
        <div class="ml-3 mr-3 facet-dec-title">{{title_x}}</div>
        <div class="bb-divider flex-grow-1 mr-4"></div>
      </div>
      <div v-else class="mt-3"></div>

      <!--Facet plot-->
      <div class="h-100 d-flex mt-1 mb-3 overflow-auto">
        <!--vis container-->
        <div id="mn-facet-container" ref="chart" class="ml-2 flex-grow-1"></div>

        <!--title for y-->
        <div v-if="title_y" class="d-flex flex-column mr-1">
          <div class="bb-divider-v flex-grow-1"></div>
          <div class="mt-3 mb-3 bb-text-v facet-dec-title">{{title_y}}</div>
          <div class="bb-divider-v flex-grow-1 mb-4"></div>
        </div>
        <div v-else class="mr-3"></div>
      </div>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import {SCHEMA} from '../../controllers/constants'
  import DotPlot from '../../controllers/monitor/monitor_dot_plot'
  import _ from 'lodash'

  // persist through view changes
  let highlighted_dots = []

  export default {
    name: 'MonitorMainView',
    data () {
      return {
        label: '',
        data: [],
        charts: [],
        title_x: null,
        title_y: null
      }
    },
    mounted () {
      bus.$on('/monitor/snapshot', () => {
        this.label = store.configs.x_axis
        this.wrangleData()
        this.draw()
      })

      // events from other views
      bus.$on('facet', () => {
        this.draw()
      })
      bus.$on('highlight-dots', (uids) => {
        highlighted_dots = uids
        _.each(this.charts, (chart) => chart.updateHighlightedDots(uids))
      })

      // events from within the chart
      // brush: make sure only one brush is active across all subplots
      bus.$on('brush-remove', (s) => {
        _.each(this.charts, (chart) => {
          if (s !== chart.brush.selector) chart.brush.clear()
        })
      })
    },
    methods: {
      wrangleData () {
        // sort by point estimate, NA will be at the beginning
        store.outcomes = _.sortBy(store.outcomes, (d) =>
          _.isNumber(d[SCHEMA.POINT]) ? d[SCHEMA.POINT] : -Infinity)

        // the first non NA
        let i = _.findIndex(store.outcomes, (d) => _.isNumber(d[SCHEMA.POINT]))

        // set the x range, shared by small multiples
        if (i >= 0) {
          store.x_range = [store.outcomes[i][SCHEMA.POINT] * 1.1,
            store.outcomes[store.outcomes.length - 1][SCHEMA.POINT] * 1.1]
        } else {
          store.x_range = [0, 0]
        }

        // also use a separate field to indicate if there is NA
        this._has_na = i !== 0

        // join with warning data
        let lookup = {}
        _.each(store.error_messages, (d) => lookup[d.uid] = true)
        _.each(store.outcomes, (d) => {
          d.color = d.uid in lookup ? (d.exit_code > 0 ? 2 : 1) : 0
        })
      },

      /**
       * Set the chart size for a small multiple subplot
       */
      setChartSize (s, nx, ny, x, y, wrap) {
        let h_max = 160 // max chart height
        let h_min = 100 // min chart height
        let padding = 20  // space for option title
        let title = 3  // space for decision title
        let dim_y = ny > 1 && !wrap  // whether there will be titles on the y dimension

        let w = this.$refs.chart.clientWidth - (dim_y ? title : 0)
        let h = this.$refs.chart.clientHeight - (nx > 1 ? title : 0)
        let px = dim_y && x === nx - 1 ? padding : 0
        let py = wrap || (nx > 1 && y < 1) ? padding : 0
        w = dim_y ? (w - padding) / nx : w / nx
        h = wrap ? h / ny - padding : (nx > 1 ? (h - padding) / ny : h / ny)

        // adjust h according to aspect ratio and min/max chart height
        h = Math.max(Math.min(w, h, h_max), h_min)

        s.outerWidth = Math.floor(w + px)
        s.outerHeight = Math.floor(h + py)
        s.margin.right += px
        s.margin.top += py
        s.title_font_size = h < 250 ? 11 : 12
      },

      /**
       * Unify axis range for multi-view consistency
       */
      updateRange () {
        // get range from each subplot
        let ranges = _.map(this.charts, (chart) => chart.getRange())

        // merge the intervals
        let low = Math.min(..._.map(ranges, (r) => r[0]))
        let high = Math.max(..._.map(ranges, (r) => r[1]))
        ranges = [low, high]

        // set
        _.each(this.charts, (chart) => { chart.setRange(ranges) })
      },

      /**
       * Compute the layout of the small multiples
       * @param data
       * @returns {{data: Array, labels: Array, wrap: boolean}}
       */
      applyFacet (data) {
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

          // we want to facet along the y-axis first... so transpose everything
          // comment out to have boba 1 behavior (except for auto-wrapping)
          if (store.facet[1] == null) {
            sub = _.unzip(sub)
            titles = _.unzip(titles)
            wrap = true
          }
        }

        return {data: sub, labels: titles, wrap: wrap}
      },

      clear () {
        // remove all nodes
        let nd = document.getElementById('mn-facet-container')
        while (nd.firstChild) {
          nd.removeChild(nd.firstChild)
        }
        // since we also removed the brush, send an event with empty brush
        bus.$emit('brush', [])
      },

      draw () {
        // remove previous charts
        this.clear()
        this.charts = []
        let data = store.outcomes

        // facet data
        let tmp = this.applyFacet(data)
        data = tmp.data
        let labels = tmp.labels

        // create subplots
        let n_columns = 0
        _.each(data, (row, ir) => {
          n_columns = Math.max(n_columns, row.length)
          let g = document.createElement('div')
          g.setAttribute('class', 'd-flex')

          document.getElementById('mn-facet-container').appendChild(g)
          _.each(row, (sp, ip) => {
            let div_id = `mn-vis-${ir}-${ip}`
            let div = document.createElement('div')
            div.setAttribute('id', div_id)
            g.appendChild(div)

            let chart = new DotPlot()
            this.setChartSize(chart, n_columns, data.length, ip, ir, tmp.wrap)
            chart.row_title = tmp.wrap ? labels[ir][ip].x
              : ir === 0 ? labels[ir][ip].x : null
            chart.col_title = ip === row.length - 1 ? labels[ir][ip].y : null
            // chart.y_axis_label = ip === 0
            chart.x_axis_label = ir === data.length - 1 ? this.label : ' '
            chart.has_na = this._has_na
            chart.init(`#${div_id}`, data[ir][ip])

            this.charts.push(chart)
          })
        })

        // unify scale, and draw
        this.updateRange()
        _.each(this.charts, (chart) => {
          chart.draw()

          // persist through facet
          chart.updateHighlightedDots(highlighted_dots)
        })
      }
    }
  }
</script>

<style scoped lang="stylus">

</style>
