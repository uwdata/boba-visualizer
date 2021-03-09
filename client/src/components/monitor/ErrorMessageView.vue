<template>
  <div class="mn-card d-flex flex-column">
    <div class="mn-card-title-lg">Error Messages</div>

    <!--No data or no error messages -->
    <div v-if="!ready"></div>
    <div v-else-if="messages.length < 1" class="text-muted text-center" style="margin-top:50%">
      <small>no errors yet :)</small>
    </div>

    <!--Message list-->
    <div v-else class="mn-card-body mt-3 h-100 overflow-auto">
      <vuescroll :ops="scroll_config">
        <div v-for="d in messages" class="mb-3">
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
          <div v-if="!d.complete" class="mn-btn-more" @click="clickShowMore(d)">
            {{d.less ? 'show more' : 'show less'}}</div>
        </div>
      </vuescroll>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import _ from 'lodash'
  import vuescroll from 'vuescroll'

  export default {
    name: 'ErrorMessageView',
    components: {vuescroll},
    data () {
      return {
        ready: false,
        messages: [],
        scroll_config: {
          bar: {background: '#aaa', opacity: 0.5}
        }
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        //todo: move this call to a button
        store.fetchMonitorSnapshot()
          .then(() => {
            this.ready = true
            this.updateData()
          }, (e) => {
            alert(e)
          })
      })
    },
    methods: {
      updateData () {
        let data = []
        const colors = ['#f58518', '#e45756']
        const preview_lines = 4

        // first, group by if the exit code is non-zero
        let gp = _.groupBy(store.error_messages, (d) => d.exit_code > 0 ? 1 : 0)

        // inside each group, group by the message cluster
        _.each(gp, (arr, code) => {
          let gp2 = _.groupBy(arr, 'group')
          _.each(gp2, (arr, cluster) => {
            // here we throw away individual messages, but only keep a list of uids
            let uids = _.map(arr, (d) => d.uid)
            let msg = arr[0].message
            let lines = msg.split('\n')
            let preview = _.trim(_.slice(lines, 0, 4).join('\n'))

            data.push({code: Number(code), color: colors[code], summary: cluster,
              full_message: msg, uids: uids, count: uids.length,
              complete: lines.length <= preview_lines, less: true, preview: preview})
          })
        })

        // sort by exit code (error > warning), then by the number of uids
        this.messages = _.orderBy(data, ['code', 'count'], ['desc', 'desc'])
      },

      clickShowMore (d) {
        d.less = !d.less
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

</style>
