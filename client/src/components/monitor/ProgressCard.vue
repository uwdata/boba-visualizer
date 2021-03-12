<template>
  <div class="mn-card h-100">
    <div v-if="status" class="ml-3 mr-3">
      <div class="d-flex justify-content-between">
        <div>
          <span class="font-weight-bold text-large">Status: {{status}}</span>
          <span v-if="time_left && status === STATUS.RUNNING" class="ml-3 text-muted text-small">
            {{getTimeLeft()}} left ...</span>
        </div>
        <!--color legend-->
        <!--<div><small v-if="failed" class="text-danger">{{failed}} errors</small></div>-->
      </div>

      <!--progress bar-->
      <div class="w-100 d-flex mt-3 mn-progress-bar">
        <div v-for="p in progress" class="mn-bar-segment" :style="barStyle(p)"
             v-b-tooltip.hover :title="getHint(p)"></div>
      </div>

      <!--buttons-->
      <div class="mt-4 d-flex justify-content-end" v-if="!sending_request">
        <b-button class="ml-3 mn-button-primary" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.RUNNING" @click="onStopClick">STOP</b-button>
        <b-button class="ml-3 mn-button-primary" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.EMPTY" @click="startRun">START</b-button>
        <b-button class="ml-3 mn-button-primary" variant="outline-info" size="sm" squared
                  v-if="status === STATUS.STOPPED || status === STATUS.DONE">Open Visualizer</b-button>
        <b-button class="ml-3" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.STOPPED || status === STATUS.DONE"
                  @click="onStartClick">Start Over</b-button>
        <b-button class="ml-3" variant="outline-secondary" size="sm" squared
                  v-if="status === STATUS.STOPPED" @click="onResumeClick">Resume</b-button>
      </div>
      <div v-if="sending_request" class="mt-4"><small class="text-muted">
        sending command ...</small></div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {store, bus} from '../../controllers/config'
  import {RUN_STATUS} from '../../controllers/constants'

  const palette = {
    'success': '#37c2e8', //'#54a24b',
    'fail': '#e45756'
  }
  export default {
    name: 'ProgressCard',
    data () {
      return {
        status: null,
        time_left: null,
        sending_request: false,
        progress: [],
        failed: 0,
        STATUS: RUN_STATUS
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.status = store.running_status
        this.calProgress(store.exit_code)
      })
      bus.$on('/monitor/update', () => {
        this.status = store.running_status
        this.time_left = store.time_left
        this.calProgress(store.exit_code)
      })
    },
    methods: {
      calProgress (logs) {
        let total = store.universes.length
        let success = 0
        let fail = 0

        _.each(logs, (c) => {
          if (c === 0) {
            success += 1
          } else {
            fail += 1
          }
        })

        this.failed = fail
        this.progress = [
          {'id': 'success', 'count': success},
          {'id': 'fail', 'count': fail}
        ]

        this.progress = _.map(this.progress, (p, i) => {
          let left = i < 1 || i === _.findIndex(this.progress, (d) => d.count > 0)

          let right = i >= this.progress.length - 1 ||
            i === _.findLastIndex(this.progress, (d) => d.count > 0)

          // bump up the width to a minimum value if the count is non-zero
          let w = Math.round(p.count / total * 100)
          w = p.count > 0 ? Math.max(w, 1.5) : 0

          p['width'] = w
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

      getHint (p) {
        let s = p.count > 1 ? 's' : ''
        let suffix = p.id === 'success' ? 'completed successfully' : 'completed with error'
        return `${p.count} universe${s} ${suffix}`
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
      },

      startRun () {
        this.sending_request = true
        store.startRuntime()
          .then(() => {
            this.calProgress([])
            this.time_left = null
            this.status = store.running_status
            this.sending_request = false
          }, (err) => {
            this.sending_request = false
            alert(err)
          })
      },

      onStartClick () {
        // confirm box
        let msg = 'Are you sure? All progress will be erased.'
        this.$bvModal.msgBoxConfirm(msg)
          .then((yes) => {
            if (yes) {
              this.startRun()
            }
          })
          .catch(() => {})
      },

      onResumeClick () {
        this.sending_request = true
        store.resumeRuntime()
          .then(() => {
            this.status = store.running_status
            this.sending_request = false
          }, (err) => {
            alert(err)
            this.sending_request = false
          })
      },

      onStopClick () {
        this.sending_request = true
        store.stopRuntime()
          .then(() => {
            this.status = store.running_status
            this.sending_request = false
          }, (err) => {
            alert(err)
            this.sending_request = false
          })
      }
    }
  }
</script>

<style scoped lang="stylus">
.mn-progress-bar
  height 1.1rem
  border 1px solid #777
  border-radius 0.3rem
  background-color #f2f2f2

.mn-bar-segment
  transition width 0.3s

.mn-button-primary
  min-width 200px
</style>
