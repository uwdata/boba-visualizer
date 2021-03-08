<template>
  <div class="mn-card h-100">

  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import _ from 'lodash'

  export default {
    name: 'ErrorMessageView',
    data () {
      return {
        messages: []
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        //todo: move this call to a button
        store.fetchMonitorSnapshot()
          .then(() => {
            this.updateData()
          }, (e) => {
            alert(e)
          })
      })
    },
    methods: {
      updateData () {
        let data = []

        // first, group by if the exit code is non-zero
        let gp = _.groupBy(store.error_messages, (d) => d.exit_code > 0 ? 1 : 0)

        // inside each group, group by the message cluster
        _.each(gp, (arr, code) => {
          let gp2 = _.groupBy(arr, 'group')
          _.each(gp2, (arr, cluster) => {
            // here we throw away individual messages, but only keep a list of uids
            let uids = _.map(arr, (d) => d.uid)
            data.push({code: Number(code), summary: cluster, message: arr[0].message,
              uids: uids, count: uids.length})
          })
        })

        // sort by exit code (error > warning), then by the number of uids
        this.messages = _.orderBy(data, ['code', 'count'], ['desc', 'desc'])
      }
    }
  }
</script>

<style scoped>

</style>
