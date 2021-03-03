<template>
  <div class="mn-card h-100 d-flex flex-column">
    <div class="mn-card-title">Decision Sensitivity</div>
    <div id="decision-progress-vis" ref="chart" class="w-100 flex-grow-1"></div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import DecisionProgressPlot from '../../controllers/monitor/decision_progress_plot'

  export default {
    name: 'DecisionProgressView',
    data () {
      return {
        chart: null
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.chart = new DecisionProgressPlot('#decision-progress-vis',
          _.keys(store.decisions))

        let w = this.$refs.chart.clientWidth
        let h = this.$refs.chart.clientHeight
        this.chart.outerWidth = w
        this.chart.outerHeight = h
        this.chart.x_max = store.universes.length

        //draw
        this.chart.update(store.running_sensitivity)
        // this.simulateUpdates()
      })

      bus.$on('/monitor/update-sensitivity', () => {
        // update
        this.chart.update(store.running_sensitivity)
      })
    },
    methods: {
      // for debugging
      simulateUpdates () {
        const step = 1
        const speed = 1000

        let i = 0
        let iid = setInterval(() => {
          if (i >= store.running_sensitivity.length - 1) {
            clearInterval(iid)
            return
          }
          this.chart.update(_.slice(store.running_sensitivity, 0, i))
          i += step * 2
        }, speed)
      }
    }
  }
</script>

<style scoped>

</style>
