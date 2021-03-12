<template>
  <div v-if="show" class="d-flex">
    <b-button variant="outline-secondary" size="sm" squared style="font-size:12px"
              @click="getSnapshot()">Update</b-button>
    <div v-if="diff_total" class="mn-notification ml-1 mn-normal">{{diff_total}}</div>
    <div v-if="diff_err" class="mn-notification bg-danger ml-1">{{diff_err}}</div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'

  let lastTotal = 0
  let lastErr = 0

  export default {
    name: 'SnapshotButton',
    data () {
      return {
        show: false,
        diff_total: 0,
        diff_err: 0
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.getSnapshot()
      })

      bus.$on('/monitor/snapshot', () => {
        this.show = false
        lastTotal = this.countTotal()
        lastErr = this.countError()
      })

      bus.$on('/monitor/update', () => {
        this.diff_total = this.countTotal() - lastTotal
        this.diff_err = this.countError() - lastErr
        if (this.diff_total > 0) {
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

.mn-normal
  background-color: #37c2e8
</style>
