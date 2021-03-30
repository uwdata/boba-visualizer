<template>
  <div v-if="show" class="mn-card d-flex flex-column">
    <div class="mn-card-title-lg">Error Messages</div>

    <!--No data or no error messages -->
    <div v-if="!ready"></div>
    <div v-else-if="messages.length < 1" class="text-muted text-center" style="margin-top:50%">
      <small>{{empty_hint}}</small>
    </div>

    <!--Message list-->
    <div v-else class="mn-card-body mt-2 h-100 overflow-auto">
      <vuescroll :ops="scroll_config">
        <div v-for="d in messages" class="mn-message"
             :class="{clicked: d.clicked}" @click="clickMessage(d)">
          <!--Title-->
          <div class="d-flex">
            <div class="mn-error-left">
              <span :style="`color:${d.color}`"><i class="fas fa-square"></i></span>
              <span class="ml-1 font-semi-bold">{{d.code > 0 ? 'Error' : 'Warning'}}</span>
            </div>
            <div class="w-100">{{d.summary}}</div>
          </div>
          <!--Message body-->
          <div class="mt-1 mn-error-log">{{d.less ? d.preview : d.full_message}}</div>
          <div v-if="!d.complete" class="mn-btn-more" @click.stop="clickShowMore(d)">
            {{d.less ? 'show more' : 'show less'}}</div>
        </div>
      </vuescroll>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import {VIEW_TYPE} from '../../controllers/constants'
  import _ from 'lodash'
  import vuescroll from 'vuescroll'

  const NO_MSG = 'no errors yet :)'
  const EMPTY_FILTER = 'no matching messages'

  // keep track of all messages so we can recover from a filter
  let all_messages = []

  export default {
    name: 'ErrorMessageView',
    components: {vuescroll},
    data () {
      return {
        show: true,
        ready: false,
        messages: [],
        empty_hint: NO_MSG,
        scroll_config: {
          bar: {background: '#aaa', opacity: 0.5}
        }
      }
    },
    mounted () {
      bus.$on('/monitor/snapshot', () => {
        if (store.outcomes.length > 0) {
          // if no universes are run, we don't know if there are errors
          this.ready = true
        }
        this.updateData()
      })

      bus.$on('brush', (pts) => {
        // skip if this is not the active view
        if (!this.show) return

        if (!pts || pts.length < 1) {
          // by default, show all messages
          this.messages = all_messages
          this.empty_hint = NO_MSG
        } else {
          // filter messages to those with matching uid
          let uids = new Set(_.map(pts, (d) => d.uid))
          this.messages = _.filter(all_messages, (d) =>
            _.findIndex(d.uids, (uid) => uids.has(uid)) >= 0)
          this.empty_hint = EMPTY_FILTER
        }
      })

      bus.$on('/monitor/change-view', (v) => {
        this.show = v === VIEW_TYPE.ERROR
        this.clearFilter()
      })
    },
    methods: {
      updateData () {
        let data = []
        const colors = ['#ffc107', '#e45756'] //#eeca38
        const preview_lines = 2

        // first, group by if the exit code is non-zero
        let gp = _.groupBy(store.error_messages, (d) => d.exit_code > 0 ? 1 : 0)

        // inside each group, group by the message cluster
        _.each(gp, (arr, code) => {
          let gp2 = _.groupBy(arr, 'group')
          _.each(gp2, (arr, cluster) => {
            // here we throw away individual messages, but only keep a list of uids
            let uids = _.map(arr, (d) => d.uid)
            let msg = arr[0].message

            // preview is a few lines starting from the cluster line
            let lines = msg.split('\n')
            let idx = _.findIndex(lines, (l) => l.startsWith(cluster.substring(0, 6))) || 0
            let preview = _.trim(_.slice(lines, idx, idx + preview_lines).join('\n'))

            data.push({code: Number(code), color: colors[code], summary: cluster,
              full_message: msg, uids: uids, count: uids.length, clicked: false,
              complete: lines.length <= preview_lines, less: true, preview: preview})
          })
        })

        // sort by exit code (error > warning), then by the number of uids
        this.messages = _.orderBy(data, ['code', 'count'], ['desc', 'desc'])
        all_messages = this.messages
      },

      clearFilter () {
        this.messages = all_messages
        this.empty_hint = NO_MSG
        _.each(this.messages, (m) => { m.clicked = false })
        _.each(all_messages, (m) => { m.clicked = false })
      },

      clickShowMore (d) {
        d.less = !d.less
      },

      clickMessage (d) {
        // send event to update dots
        bus.$emit('highlight-dots', d.clicked ? [] : d.uids)

        // only one message can be active
        let prev = d.clicked
        _.each(this.messages, (m) => { m.clicked = false })
        _.each(all_messages, (m) => { m.clicked = false })
        d.clicked = !prev
      }
    }
  }
</script>

<style scoped lang="stylus">
.mn-error-left
  width 100px
  & .fas
    font-size 8px

.mn-error-log
  font-size 11px
  white-space pre-line

.mn-btn-more
  text-decoration underline
  cursor pointer
  font-size 11px
  font-weight 500

.mn-message
  padding 0.5rem 0.25rem
  cursor pointer
  &.clicked
    background-color #eee
</style>
