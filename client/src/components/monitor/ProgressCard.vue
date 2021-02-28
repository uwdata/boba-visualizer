<template>
  <div class="mn-card h-100">
    <div v-if="status" class="ml-3 mr-3">
      <div class="d-flex justify-content-between">
        <div>
          <span class="font-weight-bold text-large">Status: {{status}}</span>
          <span class="ml-3 text-muted text-small" v-if="time_left">
          {{getTimeLeft()}} left ...</span>
        </div>
        <!--color legend-->
        <div><small v-if="failed" class="text-danger">{{failed}} errors</small></div>
      </div>

      <!--progress bar-->
      <div class="w-100 d-flex mt-3 mn-progress-bar">
        <div v-for="p in progress" :style="barStyle(p)"></div>
      </div>

      <!--buttons-->
      <div class="mt-4 d-flex justify-content-end">
        <b-button class="ml-3 mn-button-primary" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.RUNNING">STOP</b-button>
        <b-button class="ml-3 mn-button-primary" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.EMPTY">START</b-button>
        <b-button class="ml-3 mn-button-primary" variant="outline-info" size="sm" squared
                  v-if="status === STATUS.STOPPED || status === STATUS.DONE">Open Visualizer</b-button>
        <b-button class="ml-3" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.STOPPED || status === STATUS.DONE">Rerun</b-button>
      </div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {store, bus} from '../../controllers/config'
  import {RUN_STATUS} from '../../controllers/constants'

  const palette = {
    'success': '#17a2b8', //'#54a24b',
    'fail': '#e45756'
  }
  export default {
    name: 'ProgressCard',
    data () {
      return {
        status: null,
        time_left: null,
        progress: [],
        failed: 0,
        STATUS: RUN_STATUS
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.status = store.running_status
        this.calProgress()
      })
    },
    methods: {
      calProgress () {
        let total = store.universes.length
        let success = 0
        let fail = 0

        _.each(store.exit_code, (c) => {
          if (c === 0) {
            success += 1
          } else {
            fail += 1
          }
        })

        this.failed = fail
        this.progress = [
          {'id': 'success', 'count': success},
          {'id': 'fail', 'count': fail},
          {'id': 'todo', 'count': total - success - fail}
        ]

        let pg = _.dropRight(this.progress)
        this.progress = _.map(this.progress, (p, i) => {
          let left = i < 1 || i === _.findIndex(this.progress, (d) => d.count > 0)

          let right = i >= pg.length - 1 ||
            i === _.findLastIndex(pg, (d) => d.count > 0)

          p['width'] = Math.round(p.count / total * 100)
          p['color'] =  p.id in palette ? palette[p.id] : '#f2f2f2'
          p['border'] = (left && right) ? '0.3rem' : (left ?
            '0.3rem 0 0 0.3rem' : (right ? '0 0.3rem 0.3rem 0' : '0'))

          return p
        })
      },

      barStyle (p) {
        return `width: ${p.width}%; background-color: ${p.color};`
          + `border-radius: ${p.border}`
      },
      getTimeLeft () {
        if (this.time_left < 60) {
          return 'less than a minute'
        }
        let t = Math.floor(this.time_left)
        let m = Math.floor((t % 3600) / 60)
        let h = Math.floor(t / 3600)
        let hs = h > 0 ? `${h} hour${h > 1 ? 's' : ''} and ` : ''
        let ms = `${m} minute${m > 1 ? 's' : ''}`
        return hs + ms
      }
    }
  }
</script>

<style scoped lang="stylus">
.mn-progress-bar
  height 1.1rem
  border 1px solid #777
  border-radius 0.3rem

.mn-bar-left
  border-radius 0.3rem 0 0 0.3rem
.mn-bar-right
  border-radius 0 0.3rem 0.3rem 0
.mn-bar-lone
  border-radius 0.3rem

.mn-button-primary
  min-width 200px
</style>
