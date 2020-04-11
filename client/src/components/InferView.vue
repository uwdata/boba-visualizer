<template>
  <div class="bb-container">
    <!--title-->
    <div class="pt-5 text-center" style="font-weight: 500">{{title}}</div>

    <!--chart-->
    <div id="vis-container" ref="chart" class="mt-3"></div>

    <!--caption-->
    <div class="mt-3 d-flex justify-content-center">
      <div style="max-width: 700px">{{caption}}</div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {store, bus} from '../controllers/config'
  import InferSimplePlot from '../controllers/inference/infer_simple_plot'
  import {SCHEMA} from '../controllers/constants'

  export default {
    name: "InferView",
    props: ['prune', 'type'],
    data () {
      return {
        title: '',
        caption: ''
      }
    },

    mounted () {
      bus.$on('data-ready', () => { // fixme
        if (this.type === 'simple') {
          this.title = 'Is there an effect?'
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

        let chart = new InferSimplePlot()
        this.setChartSize(chart, 700)
        chart.x_axis_label = store.configs.x_axis
        chart.draw('#vis-container', data)
      },

      drawNull () {

      }
    }
  }
</script>

<style scoped lang="stylus">
  .bb-container
    background-color #fafafa
    width 100%
    height 100vh
</style>