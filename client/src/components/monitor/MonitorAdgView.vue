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

      bus.$on('adg-node-click', (label, ev) => {
        this.createFacet(label, ev)
        this.adg.updateFacet(store.facet)
        bus.$emit('facet')
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
      },

      createFacet (label, ev) {
        let i = -1
        _.each(store.facet, (f, j) => {
          i = f === label ? j : i
        })
        if (i >= 0) {
          // remove existing facet
          store.facet.splice(i, 1)
        } else {
          // facet is full, remove the first element
          if (store.facet.length > 1) {
            store.facet.splice(1, 1)
          }
          if (!ev.shiftKey || !store.facet.length) {
            // replace
            store.facet = [label]
          } else {
            // add a second facet
            let ds = [store.facet[0], label]
            ds = _.map(ds, (name) => store.getDecisionByName(name))
            ds = _.sortBy(ds, (dec) => dec.options.length)
            ds = ds[1].options.length <= 3 ? _.reverse(ds) : ds
            store.facet = _.map(ds, (dec) => dec.name)
          }
        }
      }
    }
  }
</script>

<style scoped lang="stylus">

</style>
