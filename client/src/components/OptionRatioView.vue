<template>
  <div v-if="decisions.length > 0" class="row ml-0 mr-0 mt-2">
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
        decisions: []
      }
    },

    mounted () {
      bus.$on('brush', (arr) => {
        if (arr.length <= 0) {
          this.decisions = []
          return
        }

        let ors = store.getOptionRatio(_.map(arr, (d) => d.uid))
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
      })
    }
  }
</script>

<style lang="stylus" scoped>
  .bb-bar
    height 0.5rem

  .bb-bar-title
    font-size 0.8rem
    font-weight 500
    text-transform capitalize

  .bb-bar-text
    font-size 0.6rem
    line-height 0.7rem
    color #777
</style>