<template>
  <div v-if="show" class="mn-card d-flex flex-column">
    <div class="mn-card-title-lg">Model Quality</div>

    <!--empty hint-->
    <div v-if="uids.length < 1" class="text-muted text-center" style="margin-top:50%">
      <small>brush the dots to view</small>
    </div>

    <!--charts-->
    <div v-else class="mt-3 h-100">
      <vuescroll :ops="scroll_config">
        <div id="mn-fit-container" ref="container" class="ml-1 mr-3">
          <div v-for="uid in uids" class="mt-2"
               :id="`raw-vis-${uid}`" :key="uid"></div>
        </div>
      </vuescroll>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import {VIEW_TYPE} from '../../controllers/constants'
  import RawPlot from '../../controllers/raw_plot'
  import _ from 'lodash'
  import vuescroll from 'vuescroll'

  export default {
    name: 'MonitorModelFitView',
    components: {vuescroll},
    data () {
      return {
        show: false,
        uids: [],
        scroll_config: {
          bar: {background: '#aaa', opacity: 0.5}
        }
      }
    },
    mounted () {
      bus.$on('brush', (pts) => {
        // skip the event if this is not the active view
        if (!this.show) return

        if (!pts || pts.length < 1) {
          this.uids = []
        } else {
          this.uids = _.map(pts, (d) => d.uid)

          // fetch data
          // fixme: skip null; handle NaN in the server side
          store.fetchRaw(this.uids)
            .then((ret) => {
              this.draw(ret)
            }, (e) => {
              console.error(e)
            })
        }
      })

      bus.$on('/monitor/change-view', (v) => {
        this.show = v === VIEW_TYPE.FIT
      })
    },
    methods: {
      draw (all_data) {
        _.each(all_data, (data) => {
          // use individual range because the IV can be different ...
          let tmp = _.concat(data.actual, data.pred)
          let range = [_.min(tmp), _.max(tmp)]

          let chart = new RawPlot()
          chart.outerWidth = this.$refs.container.clientWidth
          chart.title = `Universe ${data.uid}`
          chart.x_axis_label = store.configs.x_axis_fit
          chart.dot_opacity = 0.2
          chart.draw(`#raw-vis-${data.uid}`, data, range)
        })
      },

      clear () {
        // remove all nodes
        let children = document.getElementById('mn-fit-container').childNodes
        _.each(children, (nd) => {
          while (nd.firstChild) {
            nd.removeChild(nd.firstChild)
          }
        })
      }
    }
  }
</script>

<style scoped>

</style>
