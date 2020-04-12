<template>
  <div class="bb-infer-container">
    <!--title-->
    <div class="pt-5 text-center" style="font-weight: 500">{{title}}</div>

    <!--chart-->
    <div id="vis-container" ref="chart" class="mt-3"></div>

    <!--caption-->
    <div class="mt-3 d-flex justify-content-center">
      <div class="text-justify" style="max-width: 700px">{{caption}}</div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {store, bus, util} from '../controllers/config'
  import InferSimplePlot from '../controllers/inference/infer_simple_plot'
  import {SCHEMA} from '../controllers/constants'
  import InferNullPlot from '../controllers/inference/infer_null_plot'
  import InferStackingPlot from '../controllers/inference/infer_stacking_plot'

  export default {
    name: "InferView",
    props: ['prune', 'type'],
    data () {
      return {
        title: 'Is there an effect?',
        caption: ''
      }
    },

    mounted () {
      bus.$on('data-ready', () => { // fixme
        if (this.type === 'simple') {
          this.caption = 'The density shows possible outcomes across sampling and ' +
              'decision variations. The red line marks the expected effect.'
          this.drawSimple()
        } else if (this.type === 'null') {
          store.fetchNull()
            .then(() => {
              this.drawNull()
            }, (e) => {
              console.log(e)
            })
        } else if (this.type === 'stacking') {
          store.fetchNull()
            .then(() => {
              this.drawStacking()
            }, (e) => {
              console.log(e)
            })
        }
      })
    },

    methods: {
      /**
       * Set the chart size such that it is centered properly
       * @param chart
       * @param pw Preferred width
       */
      setChartSize (chart, pw) {
        let w = this.$refs.chart.clientWidth
        chart.outerWidth = w
        if (pw < w) {
          let m = Math.round((w - pw) / 2)
          chart.margin.left = m
          chart.margin.right = m
        }
      },

      drawSimple () {
        const effect = 0
        let data = store.uncertainty

        // filter
        if (this.prune) {
          let uids = _.filter(store.predicted_diff,
            (d) => d[SCHEMA.FIT] <= store.fit_cutoff)
          uids = _.map(uids, (d) => d.uid)
          data = _.at(data, uids)
        }

        // count
        data = _.flatten(_.map(data, (arr) => arr))
        let less = _.filter(data, (d) => d < effect)
        let more = _.filter(data, (d) => d > effect)
        less = (less.length / data.length * 100).toPrecision(3)
        more = (more.length / data.length * 100).toPrecision(3)
        this.caption += ` ${less}% of the density is below ${effect} whereas` +
            ` ${more}% of the density is above ${effect}.`

        // draw
        let chart = new InferSimplePlot()
        this.setChartSize(chart, 700)
        chart.x_axis_label = store.configs.x_axis
        chart.draw('#vis-container', data)
      },

      drawNull () {
        let data = store.predicted_diff

        // filter
        if (this.prune) {
          data = _.filter(data, (d) => d[SCHEMA.FIT] <= store.fit_cutoff)
        }

        // join point estimate with null CIs
        data = _.map(data, (d, idx) => {
          d.i = idx
          let nd = store.null_dist[d.uid]
          if (nd) {
            // get the 2.5 and 97.5 percentile, and median
            d.upper = util.quantile(nd, 0.975)
            d.lower = util.quantile(nd, 0.025)
            d.median = util.quantile(nd, 0.5)
          }

          return d
        })

        // remove points without null
        data = _.filter(data, (d) => d.upper != null)

        // set caption
        let less = _.filter(data, (d) => d.diff < d.lower).length
        let more = _.filter(data, (d) => d.diff > d.upper).length
        this.caption = 'The blue dots represent the multiverse point estimates. The gray ' +
            'area depicts the range within the 2.5th and 97.5th percentile of the null ' +
            'distribution. When a point estimate falls outside the range, it is colored in red.'
        this.caption += ` Out of ${data.length} universes, ${more} has their point estimate above ` +
            `the 97.5th percentile of the null, whereas ${less} has their point estimate below the ` +
            '2.5th percentile of the null.'

        // draw
        let chart = new InferNullPlot()
        let pw = Math.min(Math.max(700, data.length), 1000)
        this.setChartSize(chart, pw)
        chart.x_axis_label = store.configs.x_axis
        chart.draw('#vis-container', data)
      },

      drawStacking () {
        let data = store.predicted_diff
        let nul = store.null_dist
        let unc = store.uncertainty

        // assign weights
        _.each(data, (d) => {
          let n = nul[d.uid]
          let u = unc[d.uid]
          if (n) {
            n.weight = d[SCHEMA.WEIGHT]
          }
          if (u) {
            u.weight = d[SCHEMA.WEIGHT]
          }
        })

        // caption
        this.caption = 'The blue density depicts the possible multiverse outcomes across' +
            ' sampling and decision variations. The red density depicts the possible outcomes' +
            ' under the null distribution. Both densities use stacking to aggregate the outcomes.'

        // draw
        let chart = new InferStackingPlot()
        this.setChartSize(chart, 700)
        chart.x_axis_label = store.configs.x_axis
        chart.draw('#vis-container', unc, nul)
      },
    }
  }
</script>

<style lang="stylus">
  .bb-infer-container
    background-color #fafafa
    width 100%
    height 100vh

  .null-point
    stroke #5D9FCD
    stroke-width 2px

  .null-point.null-outside
    stroke #e45756

  .null-median
    stroke #999

  .null-box
    fill #dcdcdc

  .density-observed, .density-null
    opacity 0.3
    stroke-linejoin round

  .density-observed
    fill #5D9FCD

  .density-null
    fill #e45756
</style>