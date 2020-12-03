<template>
  <div>
    <!--chart-->
    <div class="mt-3 ml-5">
      <!--title-->
      <div class="d-flex justify-content-center mb-2">
        <div v-for="t in titles">{{t}}</div>
      </div>
      <!--vis container-->
      <div id="vis-container" ref="chart" class="flex-grow-1"
        style="width: 900px; height: 350px"></div>
    </div>

    <!--caption-->
    <div class="text-small mt-3 ml-5 mr-3" style="padding-left: 50px">
      <p class="text-muted">
        Histogram of {{column}} for the multiverse,
        faceted along the parameter <b>{{dec}}</b>.
      </p>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import HistPlot from './histogram'
  import * as d3 from 'd3'

  function set_chart_size (s, nx, ny, x, y, wrap) {
    let h_max = 350 // max chart height
    let h_min = 160 // min chart height
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
  }

  function applyFacet (data) {
    let opts = store.getDecisionByName(this.dec).options
    let sub = _.map(opts, (opt) => {
      return _.filter(data, (d) => {
        let uni = store.getUniverseById(d.uid)
        return uni[this.dec] === opt
      })
    })

    return {data: sub, labels: opts}
  }

  function randInt(max) {
    return Math.floor(Math.random() * Math.floor(max))
  }

  export default {
    name: 'FacetPage',
    data () {
      return {
        column: 'p-value',
        cutoff: 0.05,
        dec: '',
        titles: []
      }
    },
    mounted () {
      // fetch data from server
      store.fetchUniverses()
        .then(() => {
          return store.fetchOverview()
        })
        .then(() => {
          return store.fetchPredictions()
        })
        .then(() => {
          let data = store.predicted_diff
          this.column = SCHEMA.P

          if (!(SCHEMA.P in store.configs.schema)) {
            // use point estimates if p-value is unavailable
            this.column = SCHEMA.POINT
            this.cutoff = 0
          }

          // ok pick a decision randomly
          let decs = _.keys(store.decisions)
          this.dec = decs[randInt(decs.length)]

          // facet data
          let tmp = applyFacet.call(this, data)
          data = tmp.data
          this.titles = tmp.labels

          // calculate scales
          let n_bins = Math.floor(80 / data.length)
          let dd = _.map(store.predicted_diff, (d) => d[this.column])
          let x_range = [d3.min(dd), d3.max(dd)]
          let histogram = d3.histogram()
            .value((d) => d[this.column])
            .domain(x_range)
            .thresholds(n_bins)
          let bins = _.map(data, (arr) => histogram(arr))
          let y_range = [0, d3.max(_.flatten(bins), (bin) => bin.length)]

          // create subplots
          _.each(data, (arr, i) => {
            let g = document.createElement('div')
            let div_id = `vis-${i}`
            g.setAttribute('id', div_id)

            document.getElementById('vis-container').appendChild(g)

            let chart = new HistPlot()
            set_chart_size.call(this, chart, data.length, 1, i, 1, false)
            g.setAttribute('style', `display: inline-block; width: ${chart.outerWidth}`)
            chart.y_label = i < 1 ? chart.y_label : ''
            chart.n_bins = n_bins
            chart.x_range = x_range
            chart.y_range = y_range
            chart.draw(`#${div_id}`, arr, this.column, this.cutoff)
          })
        })
    }
  }
</script>

<style scoped>

</style>
