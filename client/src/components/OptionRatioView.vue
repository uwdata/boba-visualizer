<template>
  <div v-if="decisions.length > 0" class="ml-3 mr-3 bb-or-container">
    <!--title-->
    <div class="bb-or-title text-muted">
      <span class="ml-3 mr-3">Option Ratio</span>
    </div>

    <!--bars-->
    <div class="row ml-0 mr-0 mt-2 mb-3">
      <div v-for="dec in decisions" class="col-3">
        <div class="mt-2 mb-1 bb-bar-title">{{dec.name}}</div>
        <div class="w-100 d-flex">
          <div v-for="opt in dec.value" class="bb-bar" :style="opt.style"
               v-b-tooltip.hover :title="opt.name"></div>
        </div>
        <div class="mt-1 w-100 d-flex">
          <div v-for="opt in dec.value" :style="`width:${opt.width}%;`"
               class="bb-bar-text text-truncate">
            <span v-if="opt.more">{{opt.name}}</span>
            <span v-else class="text-white">i</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {store, bus, tableau10} from '../controllers/config'

  export default {
    name: "OptionRatioView",
    data () {
      return {
        decisions: [],
        baseline: {}
      }
    },

    methods: {
      calBaseline () {
        this.baseline = store.getOptionRatio(_.map(store.predicted_diff, (d) => d.uid))
      },

      calDecisions (ors) {
        this.decisions = _.map(ors, (opts, dec) => {
          let total = _.reduce(opts, (sum, opt) => sum + opt.count, 0)
          let i = 0
          let res = _.map(opts, (opt) => {
            let color = tableau10.substr(++i * 6, 6)
            let w = Math.round(opt.count / total * 100)
            let alpha = w > 100/_.size(opts) + 5 ? 1 : 0.5
            return {name: opt.name, width: w, more: alpha === 1,
              style: `width: ${w}%; background-color: #${color}; opacity: ${alpha};`}
          })
          return {name: dec, value: res}
        })
      },

      reset () {
        this.calDecisions(this.baseline)
      }
    },

    mounted () {
      bus.$on('brush', (arr) => {
        if (arr.length <= 0) {
          this.reset()
          return
        }

        let ors = store.getOptionRatio(_.map(arr, (d) => d.uid))
        this.calDecisions(ors)
      })

      bus.$on('data-ready', () => {
        this.calBaseline()
        this.reset()
      })

      bus.$on('filter', () => {
        this.reset()
      })

      bus.$on('facet', () => {
        this.reset()
      })

      bus.$on('agg-vis.dot-click', () => {
        this.reset()
      })
    }
  }
</script>

<style lang="stylus" scoped>
  .bb-or-container
    border 1px solid rgba(0,0,0,0.07)
    min-height 230px

  .bb-or-title
    background-color #fafafa
    font-size 0.9rem
    font-weight 500
    line-height 3rem

  .bb-bar
    height 0.5rem
    animation-duration 1s

  .bb-bar-text
    font-size 0.6rem
    line-height 0.7rem
    color #777
</style>