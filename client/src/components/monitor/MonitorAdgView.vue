<template>
  <div class="mn-card d-flex flex-column">
    <!--Title-->
    <div class="mn-card-title-lg">Decision Space</div>

    <!--Body -->
    <div class="mn-card-body h-100">
      <!--ADG-->
      <div id="mn-adg-container" ref="adg" class="h-100 w-100"></div>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import ADGPlot from '../../controllers/adg_plot'
  import _ from 'lodash'

  export default {
    name: 'MonitorAdgView',
    data () {
      return {
        adg: new ADGPlot()
      }
    },
    mounted () {
      // set chart size
      this.adg.outerWidth = this.$refs.adg.clientWidth
      this.adg.outerHeight = this.$refs.adg.clientHeight

      bus.$on('data-ready', () => {
        // draw ADG
        this.adg.draw('#mn-adg-container', this.prepData())
      })

      bus.$on('/monitor/update-sensitivity', () => {
        // update color
        this.adg.updateColor(this.prepData())
      })
    },
    methods: {
      prepData () {
        let data = store.graph

        // add sensitivity, treat NaN as 0
        data.nodes = _.map(data.nodes, (nd) => {
          let sen = Number(store.sensitivity[nd.name])
          sen = _.isNaN(sen) ? 0 : sen
          return _.assign(nd, {'sensitivity': sen})
        })
        return data
      }
    }
  }
</script>

<style scoped lang="stylus">

</style>
