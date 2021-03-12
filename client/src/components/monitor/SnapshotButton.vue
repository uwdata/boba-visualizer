<template>
  <div v-if="show" class="d-flex">
    <b-button variant="outline-secondary" size="sm" squared style="font-size:12px"
              @click="getSnapshot()">Update</b-button>
    <div v-if="!diff_err" class="mn-notification ml-1 mn-normal"
         v-b-tooltip.hover :title="getHint(0)">{{diff_total}}</div>
    <div v-if="diff_err" class="mn-notification bg-danger ml-1"
         v-b-tooltip.hover :title="getHint(1)">{{diff_err}}</div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'

  // keep track of the last update
  let lastTotal = 0
  let lastErr = 0

  export default {
    name: 'SnapshotButton',
    data () {
      return {
        // whether the button is visible
        show: false,

        // new universes and errors
        diff_total: 0,
        diff_err: 0,

        // threshold for showing the notification bubble
        min_total: 1
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.getSnapshot()

        // set the threshold to be the total decision levels
        this.min_total = _.sum(_.map(store.decisions, (d) => d.length))
      })

      bus.$on('/monitor/snapshot', () => {
        this.show = false
        lastTotal = this.countTotal()
        lastErr = this.countError()
      })

      bus.$on('/monitor/update', () => {
        this.diff_total = this.countTotal() - lastTotal
        this.diff_err = this.countError() - lastErr
        if (this.diff_total > this.min_total || this.diff_err) {
          this.show = true
        }
      })
    },
    methods: {
      getSnapshot () {
        store.fetchMonitorSnapshot()
          .then(() => {}, (e) => {
            alert(e)
          })
      },

      getHint (type=0) {
        // type: 0 -- total, 1 -- error
        let s = this.diff_total > 1 ? 's' : ''
        let total = `${this.diff_total} new universe${s}`
        s = this.diff_err > 1 ? 's' : ''
        let err = type === 1 ? `${this.diff_err} new error message${s} and ` : ''
        return `${err}${total} since the last update`
      },

      countTotal () {
        return _.size(store.exit_code)
      },

      countError () {
        return _.size(_.filter(store.exit_code, (d) => d > 0))
      }
    }
  }
</script>

<style scoped lang="stylus">
.mn-notification
  font-size 10px
  font-weight 700
  color white
  border-radius 8px
  height 16px
  padding 1px 4px
  cursor default

.mn-normal
  background-color: #37c2e8
</style>
